import Stripe from "stripe";
import { database } from "@dpsoft/database";
import type { FastifyInstance } from "fastify";
import type { AppConfig } from "./config.js";
import { requireOrganization } from "./auth.js";
import { commerceSettings } from "./commerce-config.js";
import { verifyPayPal, verifyPaystack } from "./payment-providers.js";
import { z } from "zod";
import { configuredPrice, configuredPrices, planByPrice, planCatalog, type PlanId } from "./plan-catalog.js";
import { currentStandardUsage } from "./usage-meter.js";

function unavailable() { return Object.assign(new Error("Subscriptions are not available yet. The operator must configure the payment provider and recurring price."), { statusCode: 503, code: "BILLING_NOT_CONFIGURED" }); }
function client(config: AppConfig) {
  if (!config.STRIPE_SECRET_KEY || !configuredPrices(config).length) throw unavailable();
  return new Stripe(config.STRIPE_SECRET_KEY, { timeout: 15_000, maxNetworkRetries: 1 });
}
export function billingRequired(config: AppConfig) { return config.BILLING_REQUIRED === "true" || (config.NODE_ENV === "production" && config.BILLING_REQUIRED !== "false"); }
export function grantsAccess(subscription: { status: string; items: { data: Array<{ price: { id: string } }> } }, priceId: string) {
  return subscription.status === "active" && subscription.items.data.some(item => item.price.id === priceId);
}
async function subscriptions(config: AppConfig, organizationId: string) {
  const stripe = client(config);
  const account = await database.billingAccount.findUnique({ where: { organizationId } });
  if (!account) return { account: null, subscription: null, entitled: false };
  const result = await stripe.subscriptions.list({ customer: account.customerId, status: "all", limit: 100 });
  const eligible = result.data.find(s => configuredPrices(config).some(priceId => grantsAccess(s, priceId)));
  const activePlan = eligible ? eligible.items.data.map(item => planByPrice(config, item.price.id)).find(Boolean) : undefined;
  return { account, subscription: eligible ?? result.data.find(s => s.status !== "canceled") ?? result.data[0] ?? null, entitled: Boolean(eligible), activePlan };
}
export async function requireSubscription(config: AppConfig, organizationId: string) {
  if (!billingRequired(config)) return null;
  const passes = await database.paymentAttempt.findMany({ where: { organizationId, status: "APPROVED", paidUntil: { gt: new Date() } }, take: 20 });
  for (const pass of passes) {
    if (pass.provider === "offline") return null;
    if (pass.providerReference && ((pass.provider === "paypal" && await verifyPayPal(config, pass)) || (pass.provider === "paystack" && await verifyPaystack(config, pass)))) return null;
  }
  const state = await subscriptions(config, organizationId);
  if (!state.entitled || !state.activePlan) throw Object.assign(new Error("An active subscription is required. Open Subscription to manage your plan."), { statusCode: 402, code: "SUBSCRIPTION_REQUIRED" });
  return state.activePlan;
}
async function requireOwner(userId: string, organizationId: string) {
  const owner = await database.membership.findFirst({ where: { userId, organizationId, status: "ACTIVE", roles: { some: { role: { name: "OWNER", isSystem: true, organizationId } } } } });
  if (!owner) throw Object.assign(new Error("Only the organization owner can manage billing."), { statusCode: 403, code: "BILLING_OWNER_REQUIRED" });
}
async function plan(config: AppConfig, id: PlanId = "essential") {
  const priceId = configuredPrice(config, id);
  if (!priceId) throw unavailable();
  const price = await client(config).prices.retrieve(priceId, { expand: ["product"] });
  if (!price.active || price.type !== "recurring" || !price.recurring || price.unit_amount === null || price.recurring.usage_type !== "licensed") throw unavailable();
  const product = price.product;
  return { id, name: typeof product !== "string" && !product.deleted ? product.name : "Workspace subscription", amount: price.unit_amount, currency: price.currency, interval: price.recurring.interval, intervalCount: price.recurring.interval_count, live: price.livemode };
}
export async function registerBilling(app: FastifyInstance, config: AppConfig) {
  app.get("/api/v1/plans", async () => {
    const enabled = (await commerceSettings()).configuration.gateways.stripe;
    const plans = await Promise.all(planCatalog.map(async proposal => {
      if (!enabled || !config.STRIPE_SECRET_KEY || !configuredPrice(config, proposal.id)) return { ...proposal, available: false, proposed: true, live: false, intervalCount: 1 };
      try { return { ...await plan(config, proposal.id), available: true, proposed: false }; }
      catch { return { ...proposal, available: false, proposed: true, live: false, intervalCount: 1 }; }
    }));
    return { available: plans.some(p => p.available), plan: plans.find(p => p.available) ?? null, plans };
  });
  app.get("/api/v1/billing", async request => {
    const principal = await requireOrganization(request);
    await requireOwner(principal.userId, principal.organizationId);
    if (!config.STRIPE_SECRET_KEY || !configuredPrices(config).length) return { configured: false, required: billingRequired(config), entitled: false, subscription: null, plan: null };
    const state = await subscriptions(config, principal.organizationId);
    const currentPlan = planCatalog.find(p => state.subscription?.items.data.some(item => item.price.id === configuredPrice(config, p.id))) ?? planCatalog.find(p => configuredPrice(config, p.id))!;
    const price = await plan(config, currentPlan.id);
    const usage = state.activePlan ? await currentStandardUsage(principal.organizationId, state.activePlan.proposedMonthlyRuns) : null;
    return { configured: true, required: billingRequired(config), entitled: state.entitled, plan: price, usage, subscription: state.subscription ? { status: state.subscription.status, cancelAtPeriodEnd: state.subscription.cancel_at_period_end } : null, hasCustomer: Boolean(state.account) };
  });
  app.post("/api/v1/billing/checkout", async request => {
    const principal = await requireOrganization(request);
    await requireOwner(principal.userId, principal.organizationId);
    if (!(await commerceSettings()).configuration.gateways.stripe) throw unavailable();
    const input = z.object({ planId: z.enum(["essential", "business", "scale"]).default("essential") }).parse(request.body ?? {});
    const priceId = configuredPrice(config, input.planId);
    const stripe = client(config); await plan(config, input.planId);
    const state = await subscriptions(config, principal.organizationId);
    if (state.entitled || (state.subscription && !["canceled", "incomplete_expired"].includes(state.subscription.status))) throw Object.assign(new Error("A subscription already exists. Use Manage subscription to update it."), { statusCode: 409, code: "SUBSCRIPTION_EXISTS" });
    let account = state.account;
    if (!account) {
      const customer = await stripe.customers.create({ email: principal.email, metadata: { organizationId: principal.organizationId } }, { idempotencyKey: `dpsoft-customer-${principal.organizationId}` });
      account = await database.billingAccount.upsert({ where: { organizationId: principal.organizationId }, update: {}, create: { organizationId: principal.organizationId, customerId: customer.id } });
    }
    if (account.checkoutSessionId) {
      const previous = await stripe.checkout.sessions.retrieve(account.checkoutSessionId);
      if (previous.status === "open" && previous.url) {
        const lines = await stripe.checkout.sessions.listLineItems(previous.id, { limit: 2 });
        if (lines.data.length === 1 && lines.data[0]?.price?.id === priceId) return { url: previous.url };
        throw Object.assign(new Error("Finish or expire the existing checkout before selecting another plan."), { statusCode: 409, code: "CHECKOUT_PLAN_CONFLICT" });
      }
      if (previous.status === "complete" && !state.subscription) throw Object.assign(new Error("Your checkout completed. Refresh subscription status or use Manage subscription."), { statusCode: 409, code: "CHECKOUT_COMPLETED" });
    }
    const session = await stripe.checkout.sessions.create({ customer: account.customerId, mode: "subscription", line_items: [{ price: priceId!, quantity: 1 }], client_reference_id: principal.organizationId, subscription_data: { metadata: { organizationId: principal.organizationId, planId: input.planId } }, success_url: `${config.WEB_ORIGIN}/workspace?billing=success`, cancel_url: `${config.WEB_ORIGIN}/workspace?billing=cancelled` }, { idempotencyKey: `dpsoft-checkout-${principal.organizationId}-${input.planId}-${account.checkoutSessionId ?? "initial"}` });
    await database.billingAccount.update({ where: { organizationId: principal.organizationId }, data: { checkoutSessionId: session.id } });
    if (!session.url) throw unavailable();
    return { url: session.url };
  });
  app.post("/api/v1/billing/portal", async request => {
    const principal = await requireOrganization(request); await requireOwner(principal.userId, principal.organizationId);
    const account = await database.billingAccount.findUnique({ where: { organizationId: principal.organizationId } });
    if (!account) throw Object.assign(new Error("Start a subscription before opening billing management."), { statusCode: 409, code: "BILLING_ACCOUNT_REQUIRED" });
    const session = await client(config).billingPortal.sessions.create({ customer: account.customerId, return_url: `${config.WEB_ORIGIN}/workspace?billing=return` });
    return { url: session.url };
  });
}
