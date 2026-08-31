import type {
  ListingStatus,
  ListingType,
  SellerStatus,
} from '@genfeedai/enums';

/** Marketplace-owned admin list DTOs. Not the public Genfeed integration contract. */
export interface IListing {
  id: string;
  title: string;
  type: ListingType;
  status: ListingStatus;
  price: number;
  downloads: number;
  purchases: number;
}

export interface ISeller {
  id: string;
  displayName: string;
  slug: string;
  status: SellerStatus;
  totalSales: number;
  totalEarnings: number;
  stripeOnboardingComplete?: boolean;
  payoutEnabled?: boolean;
}

export interface IPurchase {
  id: string;
  listingSnapshot?: {
    title?: string;
  };
  currency: string;
  total: number;
  status: string;
  downloadCount: number;
  createdAt?: string;
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
