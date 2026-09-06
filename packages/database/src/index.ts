import { PrismaClient } from "@prisma/client";

const globalDatabase = globalThis as unknown as { dpsoftPrisma?: PrismaClient };
export const database = globalDatabase.dpsoftPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDatabase.dpsoftPrisma = database;
export * from "@prisma/client";
