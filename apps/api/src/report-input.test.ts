import { describe, expect, it } from "vitest";
import { revenueReportInput } from "./report-input.js";

const connectorId = "550e8400-e29b-41d4-a716-446655440000";
describe("revenue report request validation", () => {
  it("accepts calendar months with an optional comparison", () => {
    for (const month of ["2026-01", "2026-09", "2026-12"]) {
      expect(revenueReportInput.parse({ connectorId, month }).month).toBe(month);
    }
    expect(revenueReportInput.parse({ connectorId, month: "2026-09", comparisonMonth: "2026-08" }).comparisonMonth).toBe("2026-08");
  });
  it("rejects invalid formats and out-of-range months in either field", () => {
    for (const month of ["2026-00", "2026-13", "2026-9", "26-09", "2026-09-01", " 2026-09", "\\dddd-09"]) {
      expect(revenueReportInput.safeParse({ connectorId, month }).success).toBe(false);
      expect(revenueReportInput.safeParse({ connectorId, month: "2026-09", comparisonMonth: month }).success).toBe(false);
    }
  });
});
