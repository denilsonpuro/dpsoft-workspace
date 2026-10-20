ALTER TABLE "PaymentAttempt" ADD COLUMN "planId" TEXT;

CREATE INDEX "PaymentAttempt_organizationId_planId_status_idx"
ON "PaymentAttempt" ("organizationId", "planId", "status");
