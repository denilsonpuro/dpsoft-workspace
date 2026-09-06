import { z } from "zod";
import { authorize, type AuthorizationContext, type Permission } from "./permissions.js";

export const riskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  name: string;
  description: string;
  connectorId: string;
  permission: Permission;
  riskLevel: RiskLevel;
  mode: "READ" | "WRITE";
  requiresApproval: boolean;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  execute: (input: TInput, signal: AbortSignal) => Promise<TOutput>;
}

export class ToolExecutionError extends Error {
  constructor(public readonly code: "TOOL_NOT_FOUND" | "UNAUTHORIZED" | "APPROVAL_REQUIRED" | "INVALID_INPUT" | "INVALID_OUTPUT", message: string) {
    super(message);
  }
}

export class ToolRegistry {
  readonly #tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.#tools.has(tool.id)) throw new Error(`Tool already registered: ${tool.id}`);
    this.#tools.set(tool.id, tool);
  }

  list(): ReadonlyArray<Omit<ToolDefinition, "execute">> {
    return [...this.#tools.values()].map(({ execute: _execute, ...definition }) => definition);
  }

  async execute(input: {
    toolId: string;
    tenantId: string;
    value: unknown;
    authorization: AuthorizationContext;
    approvalGranted?: boolean;
    signal?: AbortSignal;
  }): Promise<unknown> {
    const tool = this.#tools.get(input.toolId);
    if (!tool) throw new ToolExecutionError("TOOL_NOT_FOUND", "The requested tool is not registered.");
    const decision = authorize(input.authorization, {
      tenantId: input.tenantId,
      permission: tool.permission,
      connectorId: tool.connectorId,
      toolId: tool.id
    });
    if (!decision.allowed) throw new ToolExecutionError("UNAUTHORIZED", decision.code);
    if (tool.requiresApproval && !input.approvalGranted) {
      throw new ToolExecutionError("APPROVAL_REQUIRED", "Explicit approval is required before execution.");
    }
    const parsedInput = tool.inputSchema.safeParse(input.value);
    if (!parsedInput.success) throw new ToolExecutionError("INVALID_INPUT", z.prettifyError(parsedInput.error));
    const result = await tool.execute(parsedInput.data, input.signal ?? AbortSignal.timeout(10_000));
    const parsedOutput = tool.outputSchema.safeParse(result);
    if (!parsedOutput.success) throw new ToolExecutionError("INVALID_OUTPUT", "The connector returned an invalid result.");
    return parsedOutput.data;
  }
}
