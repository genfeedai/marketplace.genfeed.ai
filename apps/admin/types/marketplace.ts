/**
 * Admin-specific types not in @genfeedai/interfaces.
 * Entity types (IListing, ISeller, IPurchase) are imported from @genfeedai/interfaces.
 */

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
