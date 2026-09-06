CREATE TABLE "LocalDevice" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "pairingHash" TEXT,
  "pairingExpiresAt" TIMESTAMP(3) NOT NULL,
  "tokenHash" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "pairedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocalDevice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LocalDevice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LocalDevice_pairingHash_key" ON "LocalDevice"("pairingHash");
CREATE UNIQUE INDEX "LocalDevice_tokenHash_key" ON "LocalDevice"("tokenHash");
CREATE INDEX "LocalDevice_organizationId_createdAt_idx" ON "LocalDevice"("organizationId", "createdAt");
