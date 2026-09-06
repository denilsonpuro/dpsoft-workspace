import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolExecutionError, ToolRegistry } from "./tools.js";

describe("ToolRegistry", () => {
  it("validates, authorizes, and executes a registered tool", async () => {
    const registry = new ToolRegistry();
    registry.register({
      id: "revenue-monthly", name: "monthly_revenue", description: "Monthly revenue", connectorId: "pg-1",
      permission: "reports.read", riskLevel: "LOW", mode: "READ", requiresApproval: false,
      inputSchema: z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }), outputSchema: z.object({ amount: z.number() }),
      execute: async () => ({ amount: 482500 })
    });
    await expect(registry.execute({ toolId: "revenue-monthly", tenantId: "tenant-a", value: { month: "2026-09" }, authorization: { tenantId: "tenant-a", userId: "u1", permissions: new Set(["reports.read"]), connectorIds: new Set(["pg-1"]), toolIds: new Set(["revenue-monthly"]) } })).resolves.toEqual({ amount: 482500 });
  });

  it("blocks approval-gated writes", async () => {
    const registry = new ToolRegistry();
    registry.register({ id: "invoice-create", name: "create_invoice", description: "Create invoice", connectorId: "pg-1", permission: "invoices.create", riskLevel: "MEDIUM", mode: "WRITE", requiresApproval: true, inputSchema: z.object({}), outputSchema: z.object({ id: z.string() }), execute: async () => ({ id: "inv-1" }) });
    await expect(registry.execute({ toolId: "invoice-create", tenantId: "t1", value: {}, authorization: { tenantId: "t1", userId: "u1", permissions: new Set(["invoices.create"]) } })).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" } satisfies Partial<ToolExecutionError>);
  });
});
