import { describe, expect, it } from "vitest";
import { configuredPrice, configuredPrices, planCatalog } from "./plan-catalog.js";
import { readConfig } from "./config.js";
describe("plan catalog", () => {
  it("defines three distinct monthly launch proposals", () => {
    expect(planCatalog.map(p => p.amount)).toEqual([3900, 9900, 24900]);
    expect(new Set(planCatalog.map(p => p.id)).size).toBe(3);
  });
  it("never uses another tier's price as fallback", () => {
    const config = readConfig({ STRIPE_PRICE_ID: "legacy", STRIPE_PRICE_BUSINESS: "business" });
    expect(configuredPrice(config, "essential")).toBe("legacy");
    expect(configuredPrice(config, "business")).toBe("business");
    expect(configuredPrice(config, "scale")).toBeUndefined();
    expect(configuredPrices(config)).toEqual(["legacy", "business"]);
  });
});
