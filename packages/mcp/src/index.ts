import { McpServer } from "@modelcontextprotocol/server";
import type { AuthorizationContext, ToolRegistry } from "@dpsoft/core";

export interface McpRequestContext {
  tenantId: string;
  authorization: AuthorizationContext;
  approvalIds: ReadonlySet<string>;
}

export class McpExecutionGateway {
  constructor(private readonly registry: ToolRegistry) {}

  execute(input: { toolId: string; tenantId: string; value: unknown; authorization: AuthorizationContext; approvalGranted?: boolean; signal?: AbortSignal }) {
    return this.registry.execute(input);
  }
}

/**
 * Protocol adapter only. Policy remains in ToolRegistry so HTTP, workflows,
 * agents, and MCP hosts receive identical authorization behavior.
 */
export function createMcpGateway(registry: ToolRegistry, getContext: () => Promise<McpRequestContext>) {
  const server = new McpServer({ name: "dpsoft-mcp-gateway", version: "0.1.0" });
  for (const tool of registry.list()) {
    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema
    }, async (input: unknown) => {
      const context = await getContext();
      const result = await registry.execute({
        toolId: tool.id,
        tenantId: context.tenantId,
        value: input,
        authorization: context.authorization,
        approvalGranted: context.approvalIds.has(tool.id)
      });
      return { structuredContent: result as Record<string, unknown>, content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    });
  }
  return server;
}
