import { randomUUID } from "node:crypto";
import { database } from "@dpsoft/database";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
import { createSession } from "./auth.js";

// Explicit opt-in: creates and removes only uniquely named integration fixtures.
describe.skipIf(process.env.RUN_DEVICE_INTEGRATION !== "1")("device pairing with PostgreSQL", () => {
  it("enforces single use, tenant isolation, expiry and revocation", async () => {
    const app = await buildApp(readConfig({ NODE_ENV: "test" }));
    const users: string[] = [];
    const organizations: string[] = [];
    try {
      async function fixture() {
        const suffix = randomUUID();
        const user = await database.user.create({ data: { email: `device-test-${suffix}@example.invalid`, displayName: "Device integration fixture", passwordHash: "not-a-login-credential" } });
        users.push(user.id);
        const org = await database.organization.create({ data: { name: "Device integration fixture", slug: `device-test-${suffix}` } });
        organizations.push(org.id);
        const role = await database.role.create({ data: { organizationId: org.id, name: "OWNER", isSystem: true } });
        const membership = await database.membership.create({ data: { organizationId: org.id, userId: user.id, status: "ACTIVE", roles: { create: { roleId: role.id } } } });
        return { org, user, membership, cookies: { dpsoft_session: await createSession(user.id, org.id) } };
      }
      const a = await fixture();
      const b = await fixture();
      const created = await app.inject({ method: "POST", url: "/api/v1/devices/pairing", cookies: a.cookies, payload: { name: "Test Mac" } });
      expect(created.statusCode).toBe(201);
      const pairing = created.json();
      expect(created.headers["cache-control"]).toBe("no-store");
      const attempts = await Promise.all([1, 2].map(() => app.inject({ method: "POST", url: "/api/v1/devices/claim", payload: { code: pairing.code } })));
      expect(attempts.map(r => r.statusCode).sort()).toEqual([200, 401]);
      const paired = attempts.find(r => r.statusCode === 200)!.json();
      const auth = { authorization: `Bearer ${paired.token}` };
      const record = await database.localDevice.findUniqueOrThrow({ where: { id: pairing.device.id } });
      expect(record.tokenHash).not.toBe(paired.token);
      expect(record.pairingHash).toBeNull();
      expect((await app.inject({ method: "POST", url: "/api/v1/devices/heartbeat", headers: auth })).statusCode).toBe(200);
      const listed = (await app.inject({ method: "GET", url: "/api/v1/devices", cookies: a.cookies })).json();
      expect(listed.devices).toHaveLength(1);
      expect(listed.devices[0]).not.toHaveProperty("tokenHash");
      expect((await app.inject({ method: "GET", url: "/api/v1/devices", cookies: b.cookies })).json().devices).toHaveLength(0);
      expect((await app.inject({ method: "DELETE", url: `/api/v1/devices/${record.id}`, cookies: b.cookies })).statusCode).toBe(404);
      await database.membershipRole.deleteMany({ where: { membershipId: a.membership.id } });
      expect((await app.inject({ method: "POST", url: "/api/v1/devices/heartbeat", headers: auth })).statusCode).toBe(401);
      const role = await database.role.findFirstOrThrow({ where: { organizationId: a.org.id, name: "OWNER" } });
      await database.membershipRole.create({ data: { membershipId: a.membership.id, roleId: role.id } });
      await database.localDevice.update({ where: { id: record.id }, data: { tokenExpiresAt: new Date(0) } });
      expect((await app.inject({ method: "POST", url: "/api/v1/devices/heartbeat", headers: auth })).statusCode).toBe(401);
      await database.localDevice.update({ where: { id: record.id }, data: { tokenExpiresAt: new Date(Date.now() + 60_000) } });
      expect((await app.inject({ method: "DELETE", url: `/api/v1/devices/${record.id}`, cookies: a.cookies })).statusCode).toBe(204);
      expect((await app.inject({ method: "POST", url: "/api/v1/devices/heartbeat", headers: auth })).statusCode).toBe(401);
      const expired = (await app.inject({ method: "POST", url: "/api/v1/devices/pairing", cookies: a.cookies, payload: { name: "Expired Mac" } })).json();
      await database.localDevice.update({ where: { id: expired.device.id }, data: { pairingExpiresAt: new Date(0) } });
      expect((await app.inject({ method: "POST", url: "/api/v1/devices/claim", payload: { code: expired.code } })).statusCode).toBe(401);
      expect(await database.auditLog.count({ where: { organizationId: a.org.id, action: "device.revoked" } })).toBe(1);
    } finally {
      for (const organizationId of organizations) {
        await database.auditLog.deleteMany({ where: { organizationId } });
        await database.organization.delete({ where: { id: organizationId } });
      }
      for (const id of users) await database.user.delete({ where: { id } });
      await app.close();
    }
  }, 30_000);
});
