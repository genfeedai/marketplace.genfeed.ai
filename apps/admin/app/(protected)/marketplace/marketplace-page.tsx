'use client';

import { ListingStatus, ListingType, SellerStatus } from '@genfeedai/enums';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { IListing, IPurchase, ISeller } from '@genfeedai/interfaces';
import { useResource } from '../../../hooks/use-resource';
import { AdminMarketplaceService } from '../../../services/marketplace.service';
import type { MarketplaceAnalyticsOverview } from '../../../types/marketplace';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type TabKey =
  | 'listings'
  | 'moderation'
  | 'sellers'
  | 'sales'
  | 'payouts'
  | 'analytics';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'listings', label: 'Listings' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'sellers', label: 'Sellers' },
  { key: 'sales', label: 'Sales' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'analytics', label: 'Analytics' },
];

const ALL_LISTING_STATUSES_VALUE = '__all-listing-statuses__';
const ALL_LISTING_TYPES_VALUE = '__all-listing-types__';
const ALL_SELLER_STATUSES_VALUE = '__all-seller-statuses__';

const STATUS_BADGE_CLASS: Record<string, string> = {
  approved: 'badge-success',
  archived: 'badge-ghost',
  completed: 'badge-success',
  failed: 'badge-error',
  pending: 'badge-warning',
  pending_review: 'badge-warning',
  processing: 'badge-info',
  published: 'badge-success',
  refunded: 'badge-warning',
  rejected: 'badge-error',
  suspended: 'badge-error',
};

function badgeClass(value?: string): string {
  if (!value) return 'badge-ghost';
  return STATUS_BADGE_CLASS[value] ?? 'badge-ghost';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    style: 'currency',
  }).format(amount / 100);
}

/* ------------------------------------------------------------------ */
/*  Temp auth token — replace with real auth when Clerk is wired in    */
/* ------------------------------------------------------------------ */

function useAuthToken(): string {
  // TODO: Replace with Clerk useAuth() or cookie-based token
  return typeof window !== 'undefined'
    ? (localStorage.getItem('marketplace_admin_token') ?? '')
    : '';
}

function getService(token: string): AdminMarketplaceService {
  return AdminMarketplaceService.getInstance(token);
}

/* ------------------------------------------------------------------ */
/*  Tiny reusable table component                                      */
/* ------------------------------------------------------------------ */

interface TableColumn<T> {
  header: string;
  key: string;
  render?: (item: T) => React.ReactNode;
}

function DataTable<T extends { id?: string }>({
  items,
  columns,
  isLoading,
  emptyLabel,
}: {
  items: T[];
  columns: TableColumn<T>[];
  isLoading: boolean;
  emptyLabel: string;
}) {
  if (isLoading) {
    return <div className="table-loading">Loading...</div>;
  }

  if (items.length === 0) {
    return <div className="table-empty">{emptyLabel}</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={((item as Record<string, unknown>).id as string) ?? idx}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const token = useAuthToken();

  const requestedTab = searchParams.get('tab');
  const initialTab: TabKey =
    requestedTab && TABS.some((tab) => tab.key === requestedTab)
      ? (requestedTab as TabKey)
      : 'moderation';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [search, setSearch] = useState('');
  const [listingStatus, setListingStatus] = useState('');
  const [listingType, setListingType] = useState('');
  const [sellerStatus, setSellerStatus] = useState('');
  const [rejectTarget, setRejectTarget] = useState<IListing | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  /* ---------- Data resources ---------- */

  const listingsResource = useResource(
    async () => {
      const service = getService(token);
      return service.getListings({
        limit: 50,
        page: 1,
        search: search || undefined,
        sort: 'createdAt: -1',
        status: listingStatus ? (listingStatus as ListingStatus) : undefined,
        type: listingType ? (listingType as ListingType) : undefined,
      });
    },
    {
      defaultValue: { listings: [] as IListing[] },
      dependencies: [search, listingStatus, listingType, token],
      enabled: activeTab === 'listings' && Boolean(token),
    },
  );

  const moderationResource = useResource(
    async () => {
      const service = getService(token);
      return service.getListings({
        limit: 50,
        page: 1,
        search: search || undefined,
        sort: 'createdAt: -1',
        status: ListingStatus.PENDING_REVIEW,
      });
    },
    {
      defaultValue: { listings: [] as IListing[] },
      dependencies: [search, token],
      enabled: activeTab === 'moderation' && Boolean(token),
    },
  );

  const sellersResource = useResource(
    async () => {
      const service = getService(token);
      return service.getSellers({
        limit: 50,
        page: 1,
        search: search || undefined,
        sort: 'totalSales: -1',
        status: sellerStatus ? (sellerStatus as SellerStatus) : undefined,
      });
    },
    {
      defaultValue: { sellers: [] as ISeller[] },
      dependencies: [search, sellerStatus, token],
      enabled: activeTab === 'sellers' && Boolean(token),
    },
  );

  const salesResource = useResource(
    async () => {
      const service = getService(token);
      return service.getPurchases({
        limit: 50,
        page: 1,
        search: search || undefined,
        sort: 'createdAt: -1',
      });
    },
    {
      defaultValue: { purchases: [] as IPurchase[] },
      dependencies: [search, token],
      enabled: activeTab === 'sales' && Boolean(token),
    },
  );

  const payoutsResource = useResource(
    async () => {
      const service = getService(token);
      return service.getPayouts({
        limit: 50,
        page: 1,
        search: search || undefined,
        sort: 'totalEarnings: -1',
      });
    },
    {
      defaultValue: { payouts: [] as ISeller[] },
      dependencies: [search, token],
      enabled: activeTab === 'payouts' && Boolean(token),
    },
  );

  const analyticsResource = useResource(
    async () => {
      const service = getService(token);
      return service.getAnalyticsOverview(30);
    },
    {
      defaultValue: {
        completedOrders: 0,
        failedOrders: 0,
        pendingOrders: 0,
        recentSales: [],
        totalPlatformFees: 0,
        totalRevenue: 0,
        totalSales: 0,
        totalSellerEarnings: 0,
      } as MarketplaceAnalyticsOverview,
      dependencies: [token],
      enabled: activeTab === 'analytics' && Boolean(token),
    },
  );

  /* ---------- Handlers ---------- */

  const handleRefresh = async () => {
    const resourceMap: Record<TabKey, { refresh: () => Promise<void> }> = {
      listings: listingsResource,
      moderation: moderationResource,
      sellers: sellersResource,
      sales: salesResource,
      payouts: payoutsResource,
      analytics: analyticsResource,
    };
    await resourceMap[activeTab].refresh();
  };

  useEffect(() => {
    if (requestedTab && TABS.some((tab) => tab.key === requestedTab)) {
      setActiveTab(requestedTab as TabKey);
    }
  }, [requestedTab]);

  const handleApprove = useCallback(
    async (listing: IListing) => {
      setIsSubmittingReview(true);
      try {
        const service = getService(token);
        await service.approveListing(listing.id);
        showToast('success', `Approved "${listing.title}"`);
        await moderationResource.refresh();
      } catch {
        showToast('error', 'Failed to approve listing');
      } finally {
        setIsSubmittingReview(false);
      }
    },
    [token, moderationResource, showToast],
  );

  const handleConfirmReject = useCallback(async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      showToast('error', 'Please provide a rejection reason');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const service = getService(token);
      await service.rejectListing(rejectTarget.id, rejectReason.trim());
      showToast('success', `Rejected "${rejectTarget.title}"`);
      setRejectTarget(null);
      setRejectReason('');
      await moderationResource.refresh();
    } catch {
      showToast('error', 'Failed to reject listing');
    } finally {
      setIsSubmittingReview(false);
    }
  }, [token, moderationResource, rejectReason, rejectTarget, showToast]);

  const handleSellerStatusToggle = useCallback(
    async (seller: ISeller) => {
      const nextStatus =
        seller.status === SellerStatus.SUSPENDED
          ? SellerStatus.APPROVED
          : SellerStatus.SUSPENDED;

      try {
        const service = getService(token);
        await service.updateSellerStatus(seller.id, nextStatus);
        showToast(
          'success',
          `${seller.displayName} set to ${nextStatus.replace('_', ' ')}`,
        );
        await sellersResource.refresh();
      } catch {
        showToast('error', 'Failed to update seller status');
      }
    },
    [token, sellersResource, showToast],
  );

  /* ---------- Column definitions ---------- */

  const listingColumns: TableColumn<IListing>[] = useMemo(
    () => [
      { header: 'Title', key: 'title' },
      { header: 'Type', key: 'type' },
      {
        header: 'Status',
        key: 'status',
        render: (listing) => (
          <span className={`badge ${badgeClass(listing.status)}`}>
            {listing.status}
          </span>
        ),
      },
      {
        header: 'Price',
        key: 'price',
        render: (listing) => formatCurrency(listing.price),
      },
      { header: 'Downloads', key: 'downloads' },
      { header: 'Purchases', key: 'purchases' },
    ],
    [],
  );

  const moderationColumns: TableColumn<IListing>[] = useMemo(
    () => [
      { header: 'Title', key: 'title' },
      { header: 'Type', key: 'type' },
      {
        header: 'Actions',
        key: 'actions',
        render: (listing) => (
          <div className="flex items-center gap-2">
            <button
              className="btn btn-primary"
              onClick={() => handleApprove(listing)}
              disabled={isSubmittingReview}
            >
              Approve
            </button>
            <button
              className="btn btn-destructive"
              onClick={() => setRejectTarget(listing)}
              disabled={isSubmittingReview}
            >
              Reject
            </button>
          </div>
        ),
      },
    ],
    [handleApprove, isSubmittingReview],
  );

  const sellersColumns: TableColumn<ISeller>[] = useMemo(
    () => [
      { header: 'Seller', key: 'displayName' },
      { header: 'Slug', key: 'slug' },
      {
        header: 'Status',
        key: 'status',
        render: (seller) => (
          <span className={`badge ${badgeClass(seller.status)}`}>
            {seller.status}
          </span>
        ),
      },
      { header: 'Sales', key: 'totalSales' },
      {
        header: 'Earnings',
        key: 'totalEarnings',
        render: (seller) => formatCurrency(seller.totalEarnings),
      },
      {
        header: 'Action',
        key: 'actions',
        render: (seller) => (
          <button
            className="btn btn-secondary"
            onClick={() => handleSellerStatusToggle(seller)}
          >
            {seller.status === SellerStatus.SUSPENDED ? 'Approve' : 'Suspend'}
          </button>
        ),
      },
    ],
    [handleSellerStatusToggle],
  );

  const salesColumns: TableColumn<IPurchase>[] = useMemo(
    () => [
      {
        header: 'Listing',
        key: 'listingSnapshot',
        render: (purchase) => purchase.listingSnapshot?.title || '-',
      },
      { header: 'Currency', key: 'currency' },
      {
        header: 'Total',
        key: 'total',
        render: (purchase) => formatCurrency(purchase.total),
      },
      {
        header: 'Status',
        key: 'status',
        render: (purchase) => (
          <span className={`badge ${badgeClass(purchase.status)}`}>
            {purchase.status}
          </span>
        ),
      },
      { header: 'Downloads', key: 'downloadCount' },
      {
        header: 'Created',
        key: 'createdAt',
        render: (purchase) =>
          purchase.createdAt
            ? new Date(purchase.createdAt).toLocaleDateString()
            : '-',
      },
    ],
    [],
  );

  const payoutsColumns: TableColumn<ISeller>[] = useMemo(
    () => [
      { header: 'Seller', key: 'displayName' },
      {
        header: 'Stripe',
        key: 'stripeOnboardingComplete',
        render: (seller) => (
          <span
            className={`badge ${seller.stripeOnboardingComplete ? 'badge-success' : 'badge-warning'}`}
          >
            {seller.stripeOnboardingComplete ? 'Ready' : 'Incomplete'}
          </span>
        ),
      },
      {
        header: 'Payouts',
        key: 'payoutEnabled',
        render: (seller) => (
          <span
            className={`badge ${seller.payoutEnabled ? 'badge-success' : 'badge-warning'}`}
          >
            {seller.payoutEnabled ? 'Enabled' : 'Disabled'}
          </span>
        ),
      },
      { header: 'Sales', key: 'totalSales' },
      {
        header: 'Total Earnings',
        key: 'totalEarnings',
        render: (seller) => formatCurrency(seller.totalEarnings),
      },
    ],
    [],
  );

  /* ---------- Derived state ---------- */

  const isRefreshing =
    listingsResource.isRefreshing ||
    moderationResource.isRefreshing ||
    sellersResource.isRefreshing ||
    salesResource.isRefreshing ||
    payoutsResource.isRefreshing ||
    analyticsResource.isRefreshing;

  const errorMap: Record<TabKey, Error | null> = {
    listings: listingsResource.error,
    moderation: moderationResource.error,
    sellers: sellersResource.error,
    sales: salesResource.error,
    payouts: payoutsResource.error,
    analytics: analyticsResource.error,
  };
  const activeError = errorMap[activeTab];

  /* ---------- Render ---------- */

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Marketplace</h1>
        <p>Admin marketplace management and moderation.</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Tab bar */}
        <div className="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`btn ${activeTab === tab.key ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto">
            <button
              className="btn btn-ghost"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh"
            >
              <svg
                className={isRefreshing ? 'spin' : ''}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                <path d="M21 3v9h-9" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        {activeTab !== 'analytics' && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input"
              style={{ minWidth: 240 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
            />

            {activeTab === 'listings' && (
              <>
                <select
                  className="select-trigger"
                  value={listingStatus || ALL_LISTING_STATUSES_VALUE}
                  onChange={(e) =>
                    setListingStatus(
                      e.target.value === ALL_LISTING_STATUSES_VALUE
                        ? ''
                        : e.target.value,
                    )
                  }
                >
                  <option value={ALL_LISTING_STATUSES_VALUE}>
                    All statuses
                  </option>
                  {Object.values(ListingStatus).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  className="select-trigger"
                  value={listingType || ALL_LISTING_TYPES_VALUE}
                  onChange={(e) =>
                    setListingType(
                      e.target.value === ALL_LISTING_TYPES_VALUE
                        ? ''
                        : e.target.value,
                    )
                  }
                >
                  <option value={ALL_LISTING_TYPES_VALUE}>All types</option>
                  {Object.values(ListingType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </>
            )}

            {activeTab === 'sellers' && (
              <select
                className="select-trigger"
                value={sellerStatus || ALL_SELLER_STATUSES_VALUE}
                onChange={(e) =>
                  setSellerStatus(
                    e.target.value === ALL_SELLER_STATUSES_VALUE
                      ? ''
                      : e.target.value,
                  )
                }
              >
                <option value={ALL_SELLER_STATUSES_VALUE}>All statuses</option>
                {Object.values(SellerStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Error alert */}
        {activeError && (
          <div className="alert alert-error">
            Failed to load marketplace data. Please refresh and retry.
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'listings' && (
          <DataTable<IListing>
            items={listingsResource.data.listings}
            columns={listingColumns}
            isLoading={listingsResource.isLoading}
            emptyLabel="No listings found"
          />
        )}

        {activeTab === 'moderation' && (
          <DataTable<IListing>
            items={moderationResource.data.listings}
            columns={moderationColumns}
            isLoading={moderationResource.isLoading}
            emptyLabel="No listings pending review"
          />
        )}

        {activeTab === 'sellers' && (
          <DataTable<ISeller>
            items={sellersResource.data.sellers}
            columns={sellersColumns}
            isLoading={sellersResource.isLoading}
            emptyLabel="No sellers found"
          />
        )}

        {activeTab === 'sales' && (
          <DataTable<IPurchase>
            items={salesResource.data.purchases}
            columns={salesColumns}
            isLoading={salesResource.isLoading}
            emptyLabel="No sales found"
          />
        )}

        {activeTab === 'payouts' && (
          <DataTable<ISeller>
            items={payoutsResource.data.payouts}
            columns={payoutsColumns}
            isLoading={payoutsResource.isLoading}
            emptyLabel="No payout records found"
          />
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="key-metric">
              <div className="key-metric-label">Revenue</div>
              <div className="key-metric-value">
                {formatCurrency(analyticsResource.data.totalRevenue)}
              </div>
            </div>
            <div className="key-metric">
              <div className="key-metric-label">Sales</div>
              <div className="key-metric-value">
                {analyticsResource.data.totalSales}
              </div>
            </div>
            <div className="key-metric">
              <div className="key-metric-label">Platform Fees</div>
              <div className="key-metric-value">
                {formatCurrency(analyticsResource.data.totalPlatformFees)}
              </div>
            </div>
            <div className="key-metric">
              <div className="key-metric-label">Seller Earnings</div>
              <div className="key-metric-value">
                {formatCurrency(analyticsResource.data.totalSellerEarnings)}
              </div>
            </div>
            <div className="key-metric">
              <div className="key-metric-label">Completed</div>
              <div className="key-metric-value">
                {analyticsResource.data.completedOrders}
              </div>
            </div>
            <div className="key-metric">
              <div className="key-metric-label">Pending</div>
              <div className="key-metric-value">
                {analyticsResource.data.pendingOrders}
              </div>
            </div>
            <div className="key-metric">
              <div className="key-metric-label">Failed</div>
              <div className="key-metric-value">
                {analyticsResource.data.failedOrders}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject dialog */}
      {rejectTarget && (
        <div
          className="dialog-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectTarget(null);
          }}
        >
          <div className="dialog-panel">
            <div className="dialog-title">Reject Listing</div>
            <div>
              <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
                Add a reason for rejecting <strong>{rejectTarget.title}</strong>
                .
              </p>
              <textarea
                className="textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection"
              />
            </div>
            <div className="dialog-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-destructive"
                onClick={handleConfirmReject}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? 'Rejecting...' : 'Reject Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            padding: '10px 18px',
            borderRadius: 'var(--radius)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            zIndex: 100,
            background:
              toast.type === 'success'
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            color: toast.type === 'success' ? '#4ade80' : '#f87171',
            border: `1px solid ${toast.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
