import { database } from "@dpsoft/database";
import { afterEach, describe, expect, it } from "vitest";
import { currentStandardUsage, reserveStandardRun } from "./usage-meter.js";

const enabled = process.env.RUN_USAGE_INTEGRATION === "1";
const describeUsage = enabled ? describe : describe.skip;
const createdOrganizationIds: string[] = [];

afterEach(async () => {
  if (createdOrganizationIds.length) {
    await database.organization.deleteMany({ where: { id: { in: createdOrganizationIds.splice(0) } } });
  }
});

describeUsage("usage meter persistence", () => {
  it("atomically reserves no more than the monthly allowance", async () => {
    const organization = await database.organization.create({ data: { name: "Usage meter test", slug: `usage-meter-${crypto.randomUUID().slice(0, 18)}` } });
    createdOrganizationIds.push(organization.id);
    const now = new Date("2026-09-08T12:00:00.000Z");
    const attempts = await Promise.allSettled(Array.from({ length: 6 }, () => reserveStandardRun(organization.id, 3, now)));
    const successes = attempts.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof reserveStandardRun>>> => result.status === "fulfilled");
    const failures = attempts.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(successes.map(result => result.value.standardRuns).sort()).toEqual([1, 2, 3]);
    expect(failures).toHaveLength(3);
    expect(failures.every(result => (result.reason as { code?: string }).code === "USAGE_LIMIT_REACHED")).toBe(true);
    await expect(currentStandardUsage(organization.id, 3, now)).resolves.toMatchObject({ standardRuns: 3, remaining: 0 });
    await expect(currentStandardUsage(organization.id, 3, new Date("2026-10-01T00:00:00.000Z"))).resolves.toMatchObject({ standardRuns: 0, remaining: 3 });
  });
});
