import { afterEach, describe, expect, it } from "vitest";
import { commerceSchema, defaultCommerce, isPlatformAdmin, majorAmount } from "./commerce-config.js";
import { validateReceipt } from "./commerce.js";
import { readConfig } from "./config.js";
import { buildApp } from "./app.js";

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
describe("commerce controls", () => {
  it("limits languages and requires actual bank instructions and positive price", () => {
    expect(commerceSchema.safeParse(defaultCommerce).success).toBe(true);
    expect(commerceSchema.safeParse({ ...defaultCommerce, defaultLanguage: "it" }).success).toBe(false);
    expect(commerceSchema.safeParse({ ...defaultCommerce, gateways: { ...defaultCommerce.gateways, offline: true } }).success).toBe(false);
  });
  it("does not promote an organization owner or an email address to platform admin", () => {
    expect(isPlatformAdmin(readConfig({}), "owner")).toBe(false);
    expect(isPlatformAdmin(readConfig({ PLATFORM_ADMIN_USER_IDS: "admin-id" }), "owner")).toBe(false);
    expect(isPlatformAdmin(readConfig({ PLATFORM_ADMIN_USER_IDS: "admin-id" }), "admin-id")).toBe(true);
  });
  it("uses currency-specific decimal places", () => { expect(majorAmount(1999, "USD")).toBe("19.99"); expect(majorAmount(1999, "JPY")).toBe("1999"); expect(majorAmount(1999, "KWD")).toBe("1.999"); });
  it("rejects spoofed receipt content and oversized files", () => {
    expect(() => validateReceipt(Buffer.from("<script>bad</script>").toString("base64"), "image/png")).toThrow();
    expect(() => validateReceipt(Buffer.alloc(4 * 1024 * 1024 + 1).toString("base64"), "image/png")).toThrow();
    expect(validateReceipt(Buffer.from("%PDF-1.7\nexample").toString("base64"), "application/pdf").length).toBeGreaterThan(8);
  });
  it("rejects anonymous access to settings, receipts and payment decisions", async () => {
    const app = await buildApp(readConfig({ NODE_ENV: "test" })); apps.push(app);
    for (const url of ["/api/v1/admin/commerce", "/api/v1/admin/payments", "/api/v1/admin/payments/00000000-0000-4000-8000-000000000000/receipt", "/api/v1/payments"]) expect((await app.inject({ method: "GET", url })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/api/v1/admin/payments/00000000-0000-4000-8000-000000000000/decision", payload: { approved: true, note: "untrusted", settlementChecked: true } })).statusCode).toBe(401);
  });
});
