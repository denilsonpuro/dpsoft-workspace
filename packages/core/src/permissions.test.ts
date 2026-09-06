import { describe, expect, it } from "vitest";
import { authorize } from "./permissions.js";

describe("authorize", () => {
  const context = { tenantId: "tenant-a", userId: "user-1", permissions: new Set(["invoices.read"]), connectorIds: new Set(["pg-1"]), toolIds: new Set(["invoice-get"]) };

  it("allows an explicitly scoped request", () => {
    expect(authorize(context, { tenantId: "tenant-a", permission: "invoices.read", connectorId: "pg-1", toolId: "invoice-get" })).toEqual({ allowed: true });
  });

  it("rejects cross-tenant access before checking permissions", () => {
    expect(authorize(context, { tenantId: "tenant-b", permission: "invoices.read" })).toEqual({ allowed: false, code: "TENANT_MISMATCH" });
  });

  it("rejects an unassigned tool", () => {
    expect(authorize(context, { tenantId: "tenant-a", permission: "invoices.read", toolId: "invoice-delete" })).toEqual({ allowed: false, code: "TOOL_DENIED" });
  });
});
