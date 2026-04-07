/**
 * Public API service for fetching marketplace content from genfeed.ai.
 *
 * All gallery/listing endpoints go through the public API.
 * Configure via NEXT_PUBLIC_GENFEED_API_URL environment variable.
 */

const API_URL =
  process.env.NEXT_PUBLIC_GENFEED_API_URL ?? 'https://api.genfeed.ai';

const ITEMS_PER_PAGE = 20;

interface GalleryQueryParams {
  page?: number;
  limit?: number;
  format?: string;
  scope?: string;
  sort?: string;
  range?: string;
  type?: string;
  [key: string]: string | number | undefined;
}

interface GalleryItem {
  id: string;
  label?: string;
  description?: string;
  ingredientUrl?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  totalViews?: number;
  ingredients?: GalleryItem[];
  [key: string]: unknown;
}

interface GalleryResponse {
  data: GalleryItem[];
  total: number;
  page: number;
  limit: number;
}

function buildQueryString(params: GalleryQueryParams): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  return searchParams.toString();
}

async function fetchGallery(
  contentType: string,
  params: GalleryQueryParams = {},
  signal?: AbortSignal,
): Promise<GalleryResponse> {
  const query = buildQueryString({
    limit: ITEMS_PER_PAGE,
    page: 1,
    ...params,
  });

  const url = `${API_URL}/public/${contentType}?${query}`;

  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${contentType}: ${response.statusText}`);
  }

  return response.json() as Promise<GalleryResponse>;
}

async function fetchLeaderboard(
  params: GalleryQueryParams = {},
  signal?: AbortSignal,
): Promise<GalleryItem[]> {
  const query = buildQueryString({
    limit: ITEMS_PER_PAGE,
    page: 1,
    range: 'week',
    sort: 'views: -1',
    type: 'video',
    ...params,
  });

  const url = `${API_URL}/public/posts?${query}`;

  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
  }

  const data = await response.json();

  return Array.isArray(data) ? data : data.data ?? [];
}

export { fetchGallery, fetchLeaderboard, ITEMS_PER_PAGE, API_URL };
export type { GalleryItem, GalleryResponse, GalleryQueryParams };
