/**
 * Marketplace types for admin UI.
 *
 * TODO: Once @genfeedai/interfaces is published with marketplace types,
 * replace these with: import type { IListing, ... } from '@genfeedai/interfaces';
 * Only MarketplaceAnalyticsOverview is admin-specific and should stay here.
 */

import type {
  ListingStatus,
  ListingType,
  PricingTier,
  PurchaseStatus,
  SellerBadgeTier,
  SellerStatus,
} from '@genfeedai/enums';

export interface ISellerPreview {
  id: string;
  displayName: string;
  slug: string;
  avatar?: string;
  badgeTier: SellerBadgeTier;
  rating: number;
  totalSales: number;
}

export interface ISeller {
  id: string;
  user: string;
  organization: string;
  displayName: string;
  slug: string;
  bio?: string;
  avatar?: string;
  website?: string;
  social: { twitter?: string; github?: string; linkedin?: string; youtube?: string };
  stripeOnboardingComplete: boolean;
  payoutEnabled: boolean;
  totalEarnings: number;
  totalSales: number;
  rating: number;
  reviewCount: number;
  followerCount: number;
  badgeTier: SellerBadgeTier;
  status: SellerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IListing {
  id: string;
  seller: ISeller;
  organization: string;
  type: ListingType;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  currency: string;
  tags: string[];
  thumbnail?: string;
  previewImages: string[];
  views: number;
  downloads: number;
  purchases: number;
  rating: number;
  reviewCount: number;
  likeCount: number;
  version: string;
  changelog?: string;
  status: ListingStatus;
  publishedAt?: string;
  rejectionReason?: string;
  pricingTier?: PricingTier;
  isOfficial?: boolean;
  installCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IPurchase {
  id: string;
  buyer: string;
  seller: string;
  listing: string;
  organization: string;
  listingSnapshot: { title: string; type: string; version: string; price: number };
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  platformFee: number;
  sellerEarnings: number;
  stripeSessionId?: string;
  paymentMethod?: string;
  status: PurchaseStatus;
  failureReason?: string;
  downloadCount: number;
  lastDownloadedAt?: string;
  hasReviewed: boolean;
  isGift: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceAnalyticsOverview {
  totalRevenue: number;
  totalSales: number;
  totalPlatformFees: number;
  totalSellerEarnings: number;
  completedOrders: number;
  pendingOrders: number;
  failedOrders: number;
  recentSales: Array<{ date: string; count: number; revenue: number }>;
}
