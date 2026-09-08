import { describe, expect, it } from "vitest";
import { monthStart } from "./usage-meter.js";
import { planCatalog } from "./plan-catalog.js";
describe("monthly standard-run boundaries", () => {
  it("uses UTC month boundaries consistently", () => {
    expect(monthStart(new Date("2026-09-30T23:59:59.999Z")).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(monthStart(new Date("2026-10-01T00:00:00.000Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
  it("has positive, ascending published limits", () => {
    expect(planCatalog.map(plan => plan.proposedMonthlyRuns)).toEqual([500, 1500, 4000]);
  });
});
