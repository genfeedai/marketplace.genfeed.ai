-- A purchase paid with GEN credits records how many credits were taken.
-- The idempotency key is the main API's call key: a retried call finds its purchase instead of creating a second one.
ALTER TABLE "purchases" ADD COLUMN "creditsPaid" INTEGER;
ALTER TABLE "purchases" ADD COLUMN "idempotencyKey" VARCHAR(200);

CREATE UNIQUE INDEX "purchases_idempotencyKey_key" ON "purchases"("idempotencyKey");
