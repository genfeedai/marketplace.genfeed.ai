import type {
  ListingStatus,
  ListingType,
  SellerStatus,
} from '@genfeedai/enums';

import type { IListing, IPurchase, ISeller } from '@genfeedai/interfaces';
import {
  deserializeCollection,
  deserializeResource,
  type JsonApiDocument,
} from '../lib/json-api';
import type { MarketplaceAnalyticsOverview } from '../types/marketplace';

const API_BASE =
  process.env.NEXT_PUBLIC_MARKETPLACE_API_URL ?? 'http://localhost:3200';

interface PaginationMeta {
  page: number;
  pages: number;
  total?: number;
}

export interface AdminListingsQuery {
  page?: number;
  limit?: number;
  sort?: string;
  status?: ListingStatus;
  type?: ListingType;
  search?: string;
}

export interface AdminSellersQuery {
  page?: number;
  limit?: number;
  sort?: string;
  status?: SellerStatus;
  search?: string;
}

export interface AdminPurchasesQuery {
  page?: number;
  limit?: number;
  sort?: string;
  status?: string;
  search?: string;
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(`${API_BASE}/admin/marketplace${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function apiFetch<T>(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export class AdminMarketplaceService {
  private static instances = new Map<string, AdminMarketplaceService>();
  private token: string;

  private constructor(token: string) {
    this.token = token;
  }

  public static getInstance(token: string): AdminMarketplaceService {
    let instance = AdminMarketplaceService.instances.get(token);
    if (!instance) {
      instance = new AdminMarketplaceService(token);
      AdminMarketplaceService.instances.set(token, instance);
    }
    return instance;
  }

  async getListings(query: AdminListingsQuery = {}): Promise<{
    listings: IListing[];
    pagination?: PaginationMeta;
  }> {
    const doc = await apiFetch<JsonApiDocument>(
      buildUrl('/listings', query as Record<string, unknown>),
      this.token,
    );

    return {
      listings: deserializeCollection<IListing>(doc),
      pagination: (doc.links as Record<string, unknown>)?.pagination as
        | PaginationMeta
        | undefined,
    };
  }

  async approveListing(listingId: string, reason?: string): Promise<IListing> {
    const doc = await apiFetch<JsonApiDocument>(
      buildUrl(`/listings/${listingId}/approve`),
      this.token,
      { method: 'POST', body: JSON.stringify({ reason }) },
    );

    return deserializeResource<IListing>(doc);
  }

  async rejectListing(listingId: string, reason: string): Promise<IListing> {
    const doc = await apiFetch<JsonApiDocument>(
      buildUrl(`/listings/${listingId}/reject`),
      this.token,
      { method: 'POST', body: JSON.stringify({ reason }) },
    );

    return deserializeResource<IListing>(doc);
  }

  async getSellers(query: AdminSellersQuery = {}): Promise<{
    sellers: ISeller[];
    pagination?: PaginationMeta;
  }> {
    const doc = await apiFetch<JsonApiDocument>(
      buildUrl('/sellers', query as Record<string, unknown>),
      this.token,
    );

    return {
      pagination: (doc.links as Record<string, unknown>)?.pagination as
        | PaginationMeta
        | undefined,
      sellers: deserializeCollection<ISeller>(doc),
    };
  }

  async updateSellerStatus(
    sellerId: string,
    status: SellerStatus,
  ): Promise<ISeller> {
    const doc = await apiFetch<JsonApiDocument>(
      buildUrl(`/sellers/${sellerId}/status`),
      this.token,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    );

    return deserializeResource<ISeller>(doc);
  }

  async getPurchases(query: AdminPurchasesQuery = {}): Promise<{
    purchases: IPurchase[];
    pagination?: PaginationMeta;
  }> {
    const doc = await apiFetch<JsonApiDocument>(
      buildUrl('/purchases', query as Record<string, unknown>),
      this.token,
    );

    return {
      pagination: (doc.links as Record<string, unknown>)?.pagination as
        | PaginationMeta
        | undefined,
      purchases: deserializeCollection<IPurchase>(doc),
    };
  }

  async getPayouts(query: AdminSellersQuery = {}): Promise<{
    payouts: ISeller[];
    pagination?: PaginationMeta;
  }> {
    const doc = await apiFetch<JsonApiDocument>(
      buildUrl('/payouts', query as Record<string, unknown>),
      this.token,
    );

    return {
      pagination: (doc.links as Record<string, unknown>)?.pagination as
        | PaginationMeta
        | undefined,
      payouts: deserializeCollection<ISeller>(doc),
    };
  }

  async getAnalyticsOverview(days = 30): Promise<MarketplaceAnalyticsOverview> {
    const doc = await apiFetch<JsonApiDocument>(
      buildUrl('/analytics/overview', { days }),
      this.token,
    );

    return deserializeResource<MarketplaceAnalyticsOverview>(doc);
  }
}
