-- Every Stripe event id is stored once so a redelivered event applies its effect once.
-- A row without processedAt marks an attempt that failed; Stripe's retry processes it again.
CREATE TABLE "stripe_events" (
    "id" VARCHAR(36) NOT NULL DEFAULT (gen_random_uuid())::text,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_events_stripeEventId_key" ON "stripe_events"("stripeEventId");
