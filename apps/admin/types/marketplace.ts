import type {
  ListingStatus,
  ListingType,
  PricingTier,
  PurchaseStatus,
  SellerBadgeTier,
  SellerStatus,
} from '@genfeedai/enums';

export interface ITimestamps {
  createdAt: string;
  updatedAt: string;
}

export interface IIdentifiable extends ITimestamps {
  id: string;
}

export interface ISellerPreview {
  id: string;
  displayName: string;
  slug: string;
  avatar?: string;
  badgeTier: SellerBadgeTier;
  rating: number;
  totalSales: number;
}

export interface ISellerSocial {
  twitter?: string;
  github?: string;
  linkedin?: string;
  youtube?: string;
}

export interface ISeller extends IIdentifiable {
  user: string;
  organization: string;
  displayName: string;
  slug: string;
  bio?: string;
  avatar?: string;
  website?: string;
  social: ISellerSocial;
  stripeOnboardingComplete: boolean;
  payoutEnabled: boolean;
  totalEarnings: number;
  totalSales: number;
  rating: number;
  reviewCount: number;
  followerCount: number;
  badgeTier: SellerBadgeTier;
  status: SellerStatus;
}

export interface IListingPreview {
  id: string;
  type: ListingType;
  title: string;
  slug: string;
  shortDescription: string;
  price: number;
  currency: string;
  thumbnail?: string;
  rating: number;
  reviewCount: number;
  downloads: number;
  pricingTier?: PricingTier;
  isOfficial?: boolean;
  installCount?: number;
  seller?: ISellerPreview;
}

export interface IListing extends IIdentifiable {
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
  previewVideo?: string;
  previewData: Record<string, unknown>;
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
  packageSource?: string;
  packageSlug?: string;
  installCount?: number;
}

export interface IListingSnapshot {
  title: string;
  type: string;
  version: string;
  price: number;
}

export interface IPurchase extends IIdentifiable {
  buyer: string;
  seller: string;
  listing: string;
  organization: string;
  listingSnapshot: IListingSnapshot;
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
  giftRecipient?: string;
  giftMessage?: string;
  discountCode?: string;
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
