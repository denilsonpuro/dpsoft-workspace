CREATE TABLE "UsageMeter" (
  "organizationId" UUID NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "standardRuns" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageMeter_pkey" PRIMARY KEY ("organizationId", "periodStart"),
  CONSTRAINT "UsageMeter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
