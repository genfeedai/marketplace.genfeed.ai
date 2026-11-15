export interface SellerRecord {
  id: string;
  user: string;
  organization: string;
  displayName: string;
  slug: string;
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  social: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    youtube?: string;
  };
  stripeAccountId?: string | null;
  stripeOnboardingComplete: boolean;
  payoutEnabled: boolean;
  totalEarnings: number;
  totalSales: number;
  rating: number;
  reviewCount: number;
  followerCount: number;
  badgeTier: string;
  status: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListingRecord {
  id: string;
  seller: string;
  organization: string;
  type: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  currency: string;
  tags: string[];
  thumbnail?: string | null;
  previewImages: string[];
  previewVideo?: string | null;
  previewData: Record<string, unknown>;
  downloadData: Record<string, unknown>;
  views: number;
  downloads: number;
  purchases: number;
  rating: number;
  reviewCount: number;
  likeCount: number;
  revenue: number;
  version: string;
  changelog?: string | null;
  status: string;
  rejectionReason?: string | null;
  publishedAt?: Date | null;
  packageSource?: string | null;
  packageSlug?: string | null;
  pricingTier: string;
  isOfficial: boolean;
  installCount: number;
  canBeSoldSeparately: boolean;
  isDeleted: boolean;
  comfyuiTemplate?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  sellerData?: SellerRecord;
}

export interface PurchaseRecord {
  id: string;
  buyer: string;
  seller: string;
  listing: string;
  organization: string;
  listingSnapshot: {
    title: string;
    type: string;
    version: string;
    price: number;
  };
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  platformFee: number;
  sellerEarnings: number;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  paymentMethod?: string | null;
  status: string;
  failureReason?: string | null;
  downloadCount: number;
  lastDownloadedAt?: Date | null;
  hasReviewed: boolean;
  review?: Record<string, unknown>;
  isGift: boolean;
  giftRecipient?: string | null;
  giftMessage?: string | null;
  discountCode?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  listingData?: ListingRecord;
  sellerData?: SellerRecord;
}
