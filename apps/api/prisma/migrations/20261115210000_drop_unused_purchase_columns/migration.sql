-- Purchase reviews and gifts have no feature behind them, and every code path
-- wrote the defaults. Abort instead of dropping data if a row holds any other
-- value, so a database that does use them is looked at first. `discount` and
-- `discountCode` stay: GEN and USD pricing and promo codes may need them.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "purchases"
        WHERE "hasReviewed"
           OR "review" IS NOT NULL
           OR "isGift"
           OR "giftRecipient" IS NOT NULL
           OR "giftMessage" IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'purchases holds review or gift data; review it before dropping these columns';
    END IF;
END
$$;

ALTER TABLE "purchases"
    DROP COLUMN "hasReviewed",
    DROP COLUMN "review",
    DROP COLUMN "isGift",
    DROP COLUMN "giftRecipient",
    DROP COLUMN "giftMessage";
