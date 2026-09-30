-- CreateTable
CREATE TABLE "sellers" (
    "id" VARCHAR(24) NOT NULL,
    "user" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "bio" VARCHAR(500),
    "avatar" TEXT,
    "website" TEXT,
    "social" JSONB NOT NULL DEFAULT '{}',
    "stripeAccountId" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "payoutEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totalEarnings" INTEGER NOT NULL DEFAULT 0,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "badgeTier" TEXT NOT NULL DEFAULT 'new',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" VARCHAR(24) NOT NULL,
    "seller" VARCHAR(24) NOT NULL,
    "organization" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(300) NOT NULL,
    "shortDescription" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'usd',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnail" TEXT,
    "previewImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previewVideo" TEXT,
    "previewData" JSONB NOT NULL DEFAULT '{}',
    "downloadData" JSONB NOT NULL DEFAULT '{}',
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "changelog" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "packageSource" TEXT,
    "packageSlug" TEXT,
    "pricingTier" TEXT NOT NULL DEFAULT 'free',
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "canBeSoldSeparately" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "comfyuiTemplate" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" VARCHAR(24) NOT NULL,
    "buyer" TEXT NOT NULL,
    "seller" VARCHAR(24) NOT NULL,
    "listing" VARCHAR(24) NOT NULL,
    "organization" TEXT NOT NULL,
    "listingSnapshot" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'usd',
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "sellerEarnings" INTEGER NOT NULL DEFAULT 0,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failureReason" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "hasReviewed" BOOLEAN NOT NULL DEFAULT false,
    "review" JSONB,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "giftRecipient" TEXT,
    "giftMessage" TEXT,
    "discountCode" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" VARCHAR(24) NOT NULL,
    "seller" VARCHAR(24) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePayoutId" TEXT,
    "failureReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sellers_user_key" ON "sellers"("user");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_slug_key" ON "sellers"("slug");

-- CreateIndex
CREATE INDEX "sellers_organization_isDeleted_idx" ON "sellers"("organization", "isDeleted");

-- CreateIndex
CREATE INDEX "sellers_badgeTier_status_idx" ON "sellers"("badgeTier", "status");

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_seller_isDeleted_idx" ON "listings"("seller", "isDeleted");

-- CreateIndex
CREATE INDEX "listings_organization_isDeleted_status_type_idx" ON "listings"("organization", "isDeleted", "status", "type");

-- CreateIndex
CREATE INDEX "listings_publishedAt_status_idx" ON "listings"("publishedAt" DESC, "status");

-- CreateIndex
CREATE INDEX "listings_isOfficial_pricingTier_status_idx" ON "listings"("isOfficial", "pricingTier", "status");

-- CreateIndex
CREATE INDEX "listings_packageSource_packageSlug_idx" ON "listings"("packageSource", "packageSlug");

-- CreateIndex
CREATE UNIQUE INDEX "listings_packageSource_packageSlug_key" ON "listings"("packageSource", "packageSlug");

-- CreateIndex
CREATE INDEX "purchases_buyer_isDeleted_organization_idx" ON "purchases"("buyer", "isDeleted", "organization");

-- CreateIndex
CREATE INDEX "purchases_seller_status_idx" ON "purchases"("seller", "status");

-- CreateIndex
CREATE INDEX "purchases_listing_status_idx" ON "purchases"("listing", "status");

-- CreateIndex
CREATE INDEX "purchases_organization_isDeleted_status_idx" ON "purchases"("organization", "isDeleted", "status");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_fkey" FOREIGN KEY ("seller") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_seller_fkey" FOREIGN KEY ("seller") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_listing_fkey" FOREIGN KEY ("listing") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_seller_fkey" FOREIGN KEY ("seller") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

