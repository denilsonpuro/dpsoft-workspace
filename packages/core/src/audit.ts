import { randomUUID } from "node:crypto";

export type AuditStatus = "SUCCESS" | "FAILURE" | "DENIED" | "PENDING_APPROVAL";

export interface AuditEvent {
  id: string;
  occurredAt: string;
  tenantId: string;
  actorId: string;
  requestId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  connectorId?: string;
  toolId?: string;
  riskLevel?: string;
  status: AuditStatus;
  metadata: Readonly<Record<string, unknown>>;
}

export function createAuditEvent(input: Omit<AuditEvent, "id" | "occurredAt">): AuditEvent {
  return Object.freeze({ id: randomUUID(), occurredAt: new Date().toISOString(), ...input });
}
