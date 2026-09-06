import { describe, expect, it } from "vitest";
import { estimateContribution } from "./pricing-economics.js";
describe("launch contribution scenarios", () => {
  it("includes inference, retries, operations, payment fees and reserve", () => {
    const result = estimateContribution(39, 500, 3, 5);
    expect(result.ai).toBeCloseTo(4);
    expect(result.cost).toBeCloseTo(16.985);
    expect(result.contribution).toBeCloseTo(22.015);
  });
  it("calculates higher tiers without claiming a guaranteed margin", () => {
    expect(estimateContribution(99, 1500, 6, 12).contribution).toBeCloseTo(57.115);
    expect(estimateContribution(249, 4000, 12, 25).contribution).toBeCloseTo(150.865);
    expect(estimateContribution(39, 50_000, 3, 5).margin).toBeLessThan(0);
  });
});
