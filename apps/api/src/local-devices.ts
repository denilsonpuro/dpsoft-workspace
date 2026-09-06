import { randomBytes } from "node:crypto";
import { database } from "@dpsoft/database";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireOrganization } from "./auth.js";
import { sha256 } from "./security.js";

const publicFields = { id: true, name: true, createdAt: true, pairingExpiresAt: true, pairedAt: true, lastSeenAt: true, tokenExpiresAt: true, revokedAt: true } as const;
const denied = () => Object.assign(new Error("Device credential is invalid, expired or revoked."), { statusCode: 401, code: "INVALID_DEVICE_CREDENTIAL" });
export function deviceBearer(value?: string) {
  if (!value || !/^Bearer [A-Za-z0-9_-]{43}$/.test(value)) throw denied();
  return value.slice(7);
}
async function owner(request: FastifyRequest) {
  const principal = await requireOrganization(request);
  const membership = await database.membership.findFirst({ where: { userId: principal.userId, organizationId: principal.organizationId, status: "ACTIVE", roles: { some: { role: { name: "OWNER", isSystem: true, organizationId: principal.organizationId } } } } });
  if (!membership) throw Object.assign(new Error("Only the organization owner can manage local devices."), { statusCode: 403, code: "DEVICE_OWNER_REQUIRED" });
  return principal;
}
export async function registerLocalDevices(app: FastifyInstance) {
  app.get("/api/v1/devices", async (request, reply) => {
    const principal = await owner(request);
    reply.header("Cache-Control", "no-store");
    return { devices: await database.localDevice.findMany({ where: { organizationId: principal.organizationId }, select: publicFields, orderBy: { createdAt: "desc" }, take: 100 }) };
  });
  app.post("/api/v1/devices/pairing", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const principal = await owner(request);
    const { name } = z.object({ name: z.string().trim().min(2).max(80) }).strict().parse(request.body);
    const code = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const device = await database.$transaction(async tx => {
      const created = await tx.localDevice.create({ data: { organizationId: principal.organizationId, createdById: principal.userId, name, pairingHash: sha256(code), pairingExpiresAt: expiresAt }, select: publicFields });
      await tx.auditLog.create({ data: { organizationId: principal.organizationId, actorId: principal.userId, requestId: request.id, action: "device.pairing_created", resourceType: "local_device", resourceId: created.id, status: "SUCCESS", metadata: {} } });
      return created;
    });
    reply.header("Cache-Control", "no-store");
    return reply.code(201).send({ device, code, expiresAt });
  });
  app.post("/api/v1/devices/claim", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { code } = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict().parse(request.body);
    const now = new Date();
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + 30 * 86_400_000);
    const device = await database.$transaction(async tx => {
      const existing = await tx.localDevice.findUnique({ where: { pairingHash: sha256(code) } });
      if (!existing) throw denied();
      const membership = await tx.membership.findFirst({ where: { userId: existing.createdById, organizationId: existing.organizationId, status: "ACTIVE", user: { deletedAt: null }, organization: { deletedAt: null }, roles: { some: { role: { name: "OWNER", isSystem: true, organizationId: existing.organizationId } } } } });
      if (!membership) throw denied();
      const claimed = await tx.localDevice.updateMany({ where: { id: existing.id, pairingHash: sha256(code), pairingExpiresAt: { gt: now }, pairedAt: null, revokedAt: null }, data: { pairingHash: null, tokenHash: sha256(token), tokenExpiresAt: expiresAt, pairedAt: now, lastSeenAt: now } });
      if (claimed.count !== 1) throw denied();
      await tx.auditLog.create({ data: { organizationId: existing.organizationId, actorId: existing.createdById, requestId: request.id, action: "device.paired", resourceType: "local_device", resourceId: existing.id, status: "SUCCESS", metadata: {} } });
      return { id: existing.id, name: existing.name, organizationId: existing.organizationId };
    });
    reply.header("Cache-Control", "no-store");
    return { device, token, expiresAt, capabilities: ["heartbeat"] };
  });
  app.post("/api/v1/devices/heartbeat", async (request, reply) => {
    const now = new Date();
    const device = await database.localDevice.findUnique({ where: { tokenHash: sha256(deviceBearer(request.headers.authorization)) } });
    if (!device || device.revokedAt || !device.tokenExpiresAt || device.tokenExpiresAt <= now) throw denied();
    const membership = await database.membership.findFirst({ where: { userId: device.createdById, organizationId: device.organizationId, status: "ACTIVE", user: { deletedAt: null }, organization: { deletedAt: null }, roles: { some: { role: { name: "OWNER", isSystem: true, organizationId: device.organizationId } } } } });
    if (!membership) throw denied();
    const updated = await database.localDevice.updateMany({ where: { id: device.id, revokedAt: null, tokenHash: device.tokenHash, tokenExpiresAt: { gt: now } }, data: { lastSeenAt: now } });
    if (updated.count !== 1) throw denied();
    reply.header("Cache-Control", "no-store");
    return { deviceId: device.id, organizationId: device.organizationId, status: "connected", capabilities: ["heartbeat"], serverTime: now };
  });
  app.delete("/api/v1/devices/:id", async (request, reply) => {
    const principal = await owner(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await database.$transaction(async tx => {
      const result = await tx.localDevice.updateMany({ where: { id, organizationId: principal.organizationId, revokedAt: null }, data: { revokedAt: new Date(), pairingHash: null, tokenHash: null } });
      if (!result.count) throw Object.assign(new Error("Active device not found."), { statusCode: 404, code: "DEVICE_NOT_FOUND" });
      await tx.auditLog.create({ data: { organizationId: principal.organizationId, actorId: principal.userId, requestId: request.id, action: "device.revoked", resourceType: "local_device", resourceId: id, status: "SUCCESS", metadata: {} } });
    });
    return reply.code(204).send();
  });
}
