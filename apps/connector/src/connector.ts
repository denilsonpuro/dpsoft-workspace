export type HealthState = "CONNECTED" | "DEGRADED" | "OFFLINE" | "ERROR" | "AUTH_REQUIRED";
export interface ConnectorHealth { state: HealthState; checkedAt: string; latencyMs?: number; version: string; details: Readonly<Record<string, string>>; }
export interface LocalTool { name: string; execute(input: unknown, signal: AbortSignal): Promise<unknown>; }
export interface DPsoftConnector { connect(signal: AbortSignal): Promise<void>; disconnect(): Promise<void>; healthCheck(signal: AbortSignal): Promise<ConnectorHealth>; listTools(): Promise<ReadonlyArray<{ name: string }>>; executeTool(name: string, input: unknown, signal: AbortSignal): Promise<unknown>; }
