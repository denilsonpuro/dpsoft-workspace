import { z } from "zod";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const revenueReportInput = z.object({
  connectorId: z.string().uuid(),
  month: monthSchema,
  comparisonMonth: monthSchema.optional()
});
