export const DEFAULT_ROLES = ["OWNER", "ADMINISTRATOR", "MANAGER", "ANALYST", "OPERATOR", "VIEWER"] as const;

export type DefaultRole = (typeof DEFAULT_ROLES)[number];
export type Permission = `${string}.${"read" | "create" | "update" | "write" | "delete" | "execute" | "approve" | "manage"}`;

export interface AuthorizationContext {
  tenantId: string;
  userId: string;
  permissions: ReadonlySet<string>;
  connectorIds?: ReadonlySet<string>;
  toolIds?: ReadonlySet<string>;
}

export interface AuthorizationRequest {
  tenantId: string;
  permission: Permission;
  connectorId?: string;
  toolId?: string;
}

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; code: "TENANT_MISMATCH" | "PERMISSION_DENIED" | "CONNECTOR_DENIED" | "TOOL_DENIED" };

export function authorize(context: AuthorizationContext, request: AuthorizationRequest): AuthorizationDecision {
  if (context.tenantId !== request.tenantId) return { allowed: false, code: "TENANT_MISMATCH" };
  if (!context.permissions.has(request.permission)) return { allowed: false, code: "PERMISSION_DENIED" };
  if (request.connectorId && context.connectorIds && !context.connectorIds.has(request.connectorId)) {
    return { allowed: false, code: "CONNECTOR_DENIED" };
  }
  if (request.toolId && context.toolIds && !context.toolIds.has(request.toolId)) {
    return { allowed: false, code: "TOOL_DENIED" };
  }
  return { allowed: true };
}
