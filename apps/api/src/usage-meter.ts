import { Prisma, database } from "@dpsoft/database";

export function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function reserveStandardRun(organizationId: string, limit: number, now = new Date()) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("A positive plan execution limit is required.");
  const periodStart = monthStart(now);
  const rows = await database.$queryRaw<Array<{ standardRuns: number }>>(Prisma.sql`
    INSERT INTO "UsageMeter" ("organizationId", "periodStart", "standardRuns", "updatedAt")
    VALUES (${organizationId}::uuid, ${periodStart}, 1, ${now})
    ON CONFLICT ("organizationId", "periodStart") DO UPDATE
      SET "standardRuns" = "UsageMeter"."standardRuns" + 1, "updatedAt" = ${now}
      WHERE "UsageMeter"."standardRuns" < ${limit}
    RETURNING "standardRuns"
  `);
  if (rows.length !== 1) {
    throw Object.assign(new Error("This organization has reached its monthly standard-run allowance. Upgrade or wait for the next UTC month."), { statusCode: 429, code: "USAGE_LIMIT_REACHED" });
  }
  return { periodStart, standardRuns: rows[0]!.standardRuns, limit, remaining: limit - rows[0]!.standardRuns };
}

export async function currentStandardUsage(organizationId: string, limit: number, now = new Date()) {
  const periodStart = monthStart(now);
  const record = await database.usageMeter.findUnique({ where: { organizationId_periodStart: { organizationId, periodStart } }, select: { standardRuns: true } });
  const standardRuns = record?.standardRuns ?? 0;
  return { periodStart, standardRuns, limit, remaining: Math.max(0, limit - standardRuns) };
}
