import { randomBytes } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { database } from "@dpsoft/database";
import { sha256 } from "./security.js";

export const SESSION_COOKIE = "dpsoft_session";
export interface Principal { userId: string; organizationId: string | null; email: string; }

export async function createSession(userId: string, organizationId: string | null) {
  const token = randomBytes(32).toString("base64url");
  await database.session.create({ data: { userId, organizationId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
  return token;
}

export async function requirePrincipal(request: FastifyRequest): Promise<Principal> {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) throw Object.assign(new Error("Authentication is required."), { statusCode: 401, code: "UNAUTHENTICATED" });
  const session = await database.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.user.deletedAt || session.revokedAt || session.expiresAt <= new Date()) throw Object.assign(new Error("The session is invalid or expired."), { statusCode: 401, code: "INVALID_SESSION" });
  return { userId: session.userId, organizationId: session.organizationId, email: session.user.email };
}

export async function requireOrganization(request: FastifyRequest): Promise<Principal & { organizationId: string }> {
  const principal = await requirePrincipal(request);
  if (!principal.organizationId) throw Object.assign(new Error("Select or create an organization first."), { statusCode: 409, code: "ORGANIZATION_REQUIRED" });
  const membership = await database.membership.findFirst({ where: { userId: principal.userId, organizationId: principal.organizationId, status: "ACTIVE", organization: { deletedAt: null } } });
  if (!membership) throw Object.assign(new Error("Active organization membership is required."), { statusCode: 403, code: "MEMBERSHIP_REQUIRED" });
  return { ...principal, organizationId: principal.organizationId };
}
