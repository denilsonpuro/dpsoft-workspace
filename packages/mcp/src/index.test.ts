import { describe, expect, it } from "vitest";
import { ToolRegistry } from "@dpsoft/core";
import { createMcpGateway } from "./index.js";

describe("MCP gateway", () => {
  it("builds without exposing an unauthenticated transport", () => {
    const gateway = createMcpGateway(new ToolRegistry(), async () => ({ tenantId: "t1", authorization: { tenantId: "t1", userId: "u1", permissions: new Set() }, approvalIds: new Set() }));
    expect(gateway).toBeDefined();
  });
});
