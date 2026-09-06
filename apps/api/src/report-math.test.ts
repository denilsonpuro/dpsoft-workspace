import { describe, expect, it } from "vitest";
import { decimalDifference } from "./report-math.js";
describe("exact financial difference", () => {
  it("avoids floating point rounding", () => { expect(decimalDifference("0.30", "0.10")).toBe("0.20"); });
  it("supports large decimals and negative changes", () => { expect(decimalDifference("9007199254740993.01", "9007199254740992.99")).toBe("0.02"); expect(decimalDifference("-2.5", "1.25")).toBe("-3.75"); });
  it("rejects non-finite values", () => { expect(() => decimalDifference("NaN", "1")).toThrow(); });
});
