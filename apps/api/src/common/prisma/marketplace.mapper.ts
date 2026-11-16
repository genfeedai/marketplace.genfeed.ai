import {
  asJsonObject,
  asOptionalJsonObject,
} from '@api/common/prisma/json.util';
import type {
  ListingRecord,
  PurchaseRecord,
  SellerRecord,
} from '@api/common/prisma/marketplace.types';
import type {
  Listing as PrismaListing,
  Purchase as PrismaPurchase,
  Seller as PrismaSeller,
} from '@api/generated/prisma/client';

export function mapSellerRecord(seller: PrismaSeller): SellerRecord {
  return {
    avatar: seller.avatar,
    badgeTier: seller.badgeTier,
    bio: seller.bio,
    createdAt: seller.createdAt,
    displayName: seller.displayName,
    followerCount: seller.followerCount,
    id: seller.id,
    isDeleted: seller.isDeleted,
    organization: seller.organization,
    payoutEnabled: seller.payoutEnabled,
    rating: seller.rating,
    reviewCount: seller.reviewCount,
    slug: seller.slug,
    social: asJsonObject(seller.social) as SellerRecord['social'],
    status: seller.status,
    stripeAccountId: seller.stripeAccountId,
    stripeOnboardingComplete: seller.stripeOnboardingComplete,
    totalEarnings: seller.totalEarnings,
    totalSales: seller.totalSales,
    updatedAt: seller.updatedAt,
    user: seller.user,
    website: seller.website,
  };
}

export function mapListingRecord(
  listing: PrismaListing & { sellerRecord?: PrismaSeller | null },
): ListingRecord {
  return {
    canBeSoldSeparately: listing.canBeSoldSeparately,
    changelog: listing.changelog,
    comfyuiTemplate: asOptionalJsonObject(listing.comfyuiTemplate),
    createdAt: listing.createdAt,
    currency: listing.currency,
    description: listing.description,
    downloadData: asJsonObject(listing.downloadData),
    downloads: listing.downloads,
    id: listing.id,
    installCount: listing.installCount,
    isDeleted: listing.isDeleted,
    isOfficial: listing.isOfficial,
    likeCount: listing.likeCount,
    organization: listing.organization,
    packageSlug: listing.packageSlug,
    packageSource: listing.packageSource,
    previewData: asJsonObject(listing.previewData),
    previewImages: listing.previewImages,
    previewVideo: listing.previewVideo,
    price: listing.price,
    pricingTier: listing.pricingTier,
    publishedAt: listing.publishedAt,
    purchases: listing.purchases,
    rating: listing.rating,
    rejectionReason: listing.rejectionReason,
    reviewCount: listing.reviewCount,
    revenue: listing.revenue,
    seller: listing.seller,
    sellerData: listing.sellerRecord
      ? mapSellerRecord(listing.sellerRecord)
      : undefined,
    shortDescription: listing.shortDescription,
    slug: listing.slug,
    status: listing.status,
    tags: listing.tags,
    thumbnail: listing.thumbnail,
    title: listing.title,
    type: listing.type,
    updatedAt: listing.updatedAt,
    version: listing.version,
    views: listing.views,
  };
}

export function mapPurchaseRecord(
  purchase: PrismaPurchase & {
    listingRecord?: PrismaListing | null;
    sellerRecord?: PrismaSeller | null;
  },
): PurchaseRecord {
  return {
    buyer: purchase.buyer,
    createdAt: purchase.createdAt,
    creditsPaid: purchase.creditsPaid,
    currency: purchase.currency,
    discount: purchase.discount,
    discountCode: purchase.discountCode,
    downloadCount: purchase.downloadCount,
    failureReason: purchase.failureReason,
    id: purchase.id,
    isDeleted: purchase.isDeleted,
    lastDownloadedAt: purchase.lastDownloadedAt,
    listing: purchase.listing,
    listingData: purchase.listingRecord
      ? mapListingRecord(purchase.listingRecord)
      : undefined,
    listingSnapshot: asJsonObject(
      purchase.listingSnapshot,
    ) as PurchaseRecord['listingSnapshot'],
    organization: purchase.organization,
    paymentMethod: purchase.paymentMethod,
    platformFee: purchase.platformFee,
    seller: purchase.seller,
    sellerData: purchase.sellerRecord
      ? mapSellerRecord(purchase.sellerRecord)
      : undefined,
    sellerEarnings: purchase.sellerEarnings,
    status: purchase.status,
    stripePaymentIntentId: purchase.stripePaymentIntentId,
    stripeSessionId: purchase.stripeSessionId,
    subtotal: purchase.subtotal,
    total: purchase.total,
    updatedAt: purchase.updatedAt,
  };
}
