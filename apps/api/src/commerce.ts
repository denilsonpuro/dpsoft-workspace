import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { Prisma, database } from "@dpsoft/database";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { requireOrganization, requirePrincipal } from "./auth.js";
import { commerceSchema, commerceSettings, currencyCode, isPlatformAdmin, languageCodes, requirePlatformAdmin } from "./commerce-config.js";
import { encryptJson, decryptJson } from "./security.js";
import { initializePayPal, initializePaystack, verifyPayPal, verifyPaystack } from "./payment-providers.js";

const summarySelect = { id: true, organizationId: true, provider: true, status: true, amountMinor: true, currency: true, accessDays: true, receiptName: true, decisionNote: true, paidUntil: true, createdAt: true } as const;
const bad = (message: string, statusCode = 400) => Object.assign(new Error(message), { statusCode });
async function owner(userId: string, organizationId: string) { if (!await database.membership.findFirst({ where: { userId, organizationId, status: "ACTIVE", roles: { some: { role: { name: "OWNER", isSystem: true, organizationId } } } } })) throw bad("Organization owner access is required.", 403); }
export function validateReceipt(base64: string, mime: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw bad("Invalid receipt encoding.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length < 8 || bytes.length > 4 * 1024 * 1024) throw bad("Receipt must be between 8 bytes and 4 MB.");
  const valid = (mime === "application/pdf" && bytes.subarray(0,5).toString() === "%PDF-") || (mime === "image/png" && bytes.subarray(0,8).toString("hex") === "89504e470d0a1a0a") || (mime === "image/jpeg" && bytes.subarray(0,3).toString("hex") === "ffd8ff");
  if (!valid) throw bad("Receipt must be a PDF, PNG or JPEG with a matching file signature.");
  return bytes;
}
export async function registerCommerce(app: FastifyInstance, config: AppConfig) {
  app.get("/api/v1/commerce", async () => {
    const { configuration: c } = await commerceSettings();
    return { ...c, languages: languageCodes, gateways: { stripe: c.gateways.stripe && Boolean(config.STRIPE_SECRET_KEY && config.STRIPE_PRICE_ID), paypal: c.gateways.paypal && Boolean(config.PAYPAL_CLIENT_ID && config.PAYPAL_CLIENT_SECRET), paystack: c.gateways.paystack && Boolean(config.PAYSTACK_SECRET_KEY), offline: c.gateways.offline }, testMode: { paypal: config.PAYPAL_ENVIRONMENT !== "live", paystack: !config.PAYSTACK_SECRET_KEY?.startsWith("sk_live_") } };
  });
  app.get("/api/v1/commerce/access", async request => { const p = await requirePrincipal(request); return { admin: isPlatformAdmin(config, p.userId) }; });
  app.get("/api/v1/commerce/rate", async request => {
    const { base, quote } = z.object({ base: currencyCode, quote: currencyCode }).parse(request.query);
    const { configuration } = await commerceSettings();
    if (!configuration.displayCurrencies.includes(quote)) throw bad("Display currency is not enabled.");
    if (base === quote) return { rate: 1, date: new Date().toISOString().slice(0,10), base, quote };
    const response = await fetch(`https://api.frankfurter.dev/v2/rate/${base}/${quote}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw bad("A reference exchange rate is unavailable. Use the billing currency.", 503);
    const data = z.object({ base: currencyCode, quote: currencyCode, rate: z.number().positive().finite(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(await response.json());
    if (data.base !== base || data.quote !== quote || Date.now() - Date.parse(data.date) > 7 * 86_400_000) throw bad("A recent reference exchange rate is unavailable.", 503);
    return { ...data, source: "Frankfurter", indicative: true };
  });
  app.get("/api/v1/admin/commerce", async request => { await requirePlatformAdmin(request, config); return commerceSettings(); });
  app.put("/api/v1/admin/commerce", async request => {
    const principal = await requirePlatformAdmin(request, config);
    const input = z.object({ version: z.number().int().nonnegative(), configuration: commerceSchema }).parse(request.body);
    await database.$transaction(async tx => {
      if (input.version === 0) { try { await tx.commerceSettings.create({ data: { id: "global", configuration: input.configuration } }); } catch { throw bad("Settings changed. Reload before saving.", 409); } }
      else { const changed = await tx.commerceSettings.updateMany({ where: { id: "global", version: input.version }, data: { configuration: input.configuration, version: { increment: 1 } } }); if (!changed.count) throw bad("Settings changed. Reload before saving.", 409); }
      if (principal.organizationId) await tx.auditLog.create({ data: { organizationId: principal.organizationId, actorId: principal.userId, requestId: request.id, action: "commerce.settings_updated", resourceType: "commerce", status: "SUCCESS", metadata: { previousVersion: input.version } } });
    });
    return commerceSettings();
  });
  app.get("/api/v1/payments", async request => { const p = await requireOrganization(request); await owner(p.userId, p.organizationId); return { payments: await database.paymentAttempt.findMany({ where: { organizationId: p.organizationId }, select: summarySelect, orderBy: { createdAt: "desc" }, take: 100 }) }; });
  app.post("/api/v1/payments", async request => {
    const p = await requireOrganization(request); await owner(p.userId, p.organizationId);
    const { provider } = z.object({ provider: z.enum(["paypal", "paystack", "offline"]) }).parse(request.body);
    const { configuration: c } = await commerceSettings();
    if (!c.gateways[provider] || !c.passAmountMinor) throw bad("This payment method is not available.", 503);
    if ((provider === "paypal" && (!config.PAYPAL_CLIENT_ID || !config.PAYPAL_CLIENT_SECRET)) || (provider === "paystack" && !config.PAYSTACK_SECRET_KEY)) throw bad("Payment provider credentials are missing.", 503);
    const pending = await database.paymentAttempt.findFirst({ where: { organizationId: p.organizationId, provider, status: "PENDING", createdAt: { gt: new Date(Date.now() - 30 * 60_000) } }, orderBy: { createdAt: "desc" } });
    if (pending) return { id: pending.id, url: pending.approvalUrl, status: pending.status };
    const payment = await database.paymentAttempt.create({ data: { organizationId: p.organizationId, provider, amountMinor: c.passAmountMinor, currency: c.passCurrency, accessDays: c.accessDays } });
    if (provider === "offline") return { id: payment.id, url: null, status: payment.status };
    try {
      const started = provider === "paypal" ? await initializePayPal(config, payment) : await initializePaystack(config, payment, p.email);
      await database.paymentAttempt.update({ where: { id: payment.id }, data: { providerReference: started.reference, approvalUrl: started.url } });
      return { id: payment.id, url: started.url, status: "PENDING" };
    } catch (cause) { await database.paymentAttempt.update({ where: { id: payment.id }, data: { status: "INITIALIZATION_FAILED" } }); throw cause; }
  });
  app.post("/api/v1/payments/:id/verify", async request => {
    const p = await requireOrganization(request); await owner(p.userId, p.organizationId);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const payment = await database.paymentAttempt.findFirst({ where: { id, organizationId: p.organizationId } });
    if (!payment || payment.provider === "offline" || !payment.providerReference) throw bad("No online payment is available for verification.", 404);
    if (payment.status === "APPROVED") return { status: payment.status, paidUntil: payment.paidUntil };
    if (payment.status !== "PENDING") throw bad("This payment cannot be verified.", 409);
    const confirmed = payment.provider === "paypal" ? await verifyPayPal(config, payment) : await verifyPaystack(config, payment);
    if (!confirmed) throw bad("Payment is not confirmed. Access has not been activated.", 409);
    const until = new Date(Date.now() + payment.accessDays * 86_400_000);
    await database.$transaction(async tx => { const changed = await tx.paymentAttempt.updateMany({ where: { id, status: "PENDING" }, data: { status: "APPROVED", paidUntil: until } }); if (changed.count) await tx.auditLog.create({ data: { organizationId: p.organizationId, actorId: p.userId, requestId: request.id, action: "payment.verified", resourceType: "payment", resourceId: id, status: "SUCCESS", metadata: { provider: payment.provider, amountMinor: payment.amountMinor, currency: payment.currency } } }); });
    return database.paymentAttempt.findUnique({ where: { id }, select: { status: true, paidUntil: true } });
  });
  app.post("/api/v1/payments/:id/receipt", { bodyLimit: 6 * 1024 * 1024 }, async request => {
    const p = await requireOrganization(request); await owner(p.userId, p.organizationId);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = z.object({ name: z.string().min(1).max(120), mime: z.enum(["application/pdf", "image/png", "image/jpeg"]), base64: z.string().max(5_600_000) }).parse(request.body);
    const bytes = validateReceipt(input.base64, input.mime);
    const hash = createHash("sha256").update(bytes).digest("hex");
    try { const changed = await database.paymentAttempt.updateMany({ where: { id, organizationId: p.organizationId, provider: "offline", status: "PENDING" }, data: { status: "UNDER_REVIEW", receiptEncrypted: encryptJson({ base64: input.base64 }, config.CREDENTIAL_ENCRYPTION_KEY), receiptHash: hash, receiptMime: input.mime, receiptName: input.name.replace(/[^a-zA-Z0-9._ -]/g, "_") } }); if (!changed.count) throw bad("This payment is not awaiting a receipt.", 409); }
    catch (cause) { if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") throw bad("This receipt has already been submitted.", 409); throw cause; }
    return { status: "UNDER_REVIEW" };
  });
  app.get("/api/v1/admin/payments", async request => { await requirePlatformAdmin(request, config); return { payments: await database.paymentAttempt.findMany({ where: { provider: "offline" }, select: { ...summarySelect, organization: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 }) }; });
  app.get("/api/v1/admin/payments/:id/receipt", async (request, reply) => {
    await requirePlatformAdmin(request, config); const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const payment = await database.paymentAttempt.findUnique({ where: { id } });
    if (!payment?.receiptEncrypted) throw bad("Receipt not found.", 404);
    const receipt = decryptJson<{ base64: string }>(payment.receiptEncrypted, config.CREDENTIAL_ENCRYPTION_KEY);
    return reply.header("Content-Type", "application/octet-stream").header("Content-Disposition", `attachment; filename="${id}.${payment.receiptMime === "application/pdf" ? "pdf" : payment.receiptMime === "image/png" ? "png" : "jpg"}"`).header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff").send(Buffer.from(receipt.base64, "base64"));
  });
  app.post("/api/v1/admin/payments/:id/decision", async request => {
    const p = await requirePlatformAdmin(request, config); const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = z.object({ approved: z.boolean(), note: z.string().trim().min(8).max(1000), settlementChecked: z.boolean() }).parse(request.body);
    if (input.approved && !input.settlementChecked) throw bad("Confirm the funds in the bank account, not just the receipt image.");
    const payment = await database.paymentAttempt.findUnique({ where: { id } });
    if (!payment || payment.provider !== "offline" || payment.status !== "UNDER_REVIEW") throw bad("Payment is not awaiting review.", 409);
    const until = input.approved ? new Date(Date.now() + payment.accessDays * 86_400_000) : null;
    await database.$transaction(async tx => { const changed = await tx.paymentAttempt.updateMany({ where: { id, status: "UNDER_REVIEW" }, data: { status: input.approved ? "APPROVED" : "REJECTED", paidUntil: until, decidedById: p.userId, decisionNote: input.note } }); if (!changed.count) throw bad("This payment was already reviewed.", 409); await tx.auditLog.create({ data: { organizationId: payment.organizationId, actorId: p.userId, requestId: request.id, action: input.approved ? "payment.offline_approved" : "payment.offline_rejected", resourceType: "payment", resourceId: id, status: "SUCCESS", metadata: { note: input.note, settlementChecked: input.settlementChecked } } }); });
    return { status: input.approved ? "APPROVED" : "REJECTED", paidUntil: until };
  });
}
