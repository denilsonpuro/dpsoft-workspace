import { describe, expect, it } from "vitest";
import { billingRequired, grantsAccess } from "./billing.js";
import { readConfig } from "./config.js";

describe("subscription entitlement", () => {
  it("requires both an active subscription and the server-configured price", () => {
    const items = { data: [{ price: { id: "price_workspace" } }] };
    expect(grantsAccess({ status: "active", items }, "price_workspace")).toBe(true);
    for (const status of ["trialing", "past_due", "unpaid", "canceled", "incomplete", "paused"]) expect(grantsAccess({ status, items }, "price_workspace")).toBe(false);
    expect(grantsAccess({ status: "active", items }, "price_other")).toBe(false);
  });
  it("defaults production to gated access and development to ungated access", () => {
    expect(billingRequired(readConfig({ NODE_ENV: "development" }))).toBe(false);
    expect(billingRequired(readConfig({ NODE_ENV: "production", SESSION_SECRET: "x".repeat(32), CREDENTIAL_ENCRYPTION_KEY: "y".repeat(32) }))).toBe(true);
    expect(billingRequired(readConfig({ NODE_ENV: "test", BILLING_REQUIRED: "true" }))).toBe(true);
  });
});
