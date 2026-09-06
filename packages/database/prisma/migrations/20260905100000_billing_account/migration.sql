CREATE TABLE "BillingAccount" (
  "organizationId" UUID NOT NULL,
  "customerId" TEXT NOT NULL,
  "checkoutSessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("organizationId")
);
CREATE UNIQUE INDEX "BillingAccount_customerId_key" ON "BillingAccount"("customerId");
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
