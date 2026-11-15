const DEFAULT_API_ORIGIN = 'https://api.genfeed.ai';
const API_VERSION = 'v1';
const DEFAULT_PAGE_SIZE = 20;
const PUBLIC_CONTENT_REVALIDATE_SECONDS = 300;

type PublicContentResource = 'images' | 'musics' | 'posts' | 'videos';

interface PublicContentAttributes {
  cdnUrl?: string;
  createdAt?: string;
  description?: string;
  duration?: number;
  height?: number;
  label?: string;
  platform?: string;
  totalComments?: number;
  totalLikes?: number;
  totalShares?: number;
  totalViews?: number;
  url?: string;
  width?: number;
  [key: string]: unknown;
}

interface PublicContentItem extends PublicContentAttributes {
  id: string;
  resourceType: string;
}

interface PublicContentQuery {
  limit?: number;
  page?: number;
  sort?: string;
}

interface PublicContentSuccess {
  items: PublicContentItem[];
  status: 'success';
}

interface PublicContentUnavailable {
  items: [];
  message: string;
  status: 'unavailable';
}

type PublicContentResult = PublicContentSuccess | PublicContentUnavailable;

interface JsonApiResource {
  attributes?: unknown;
  id?: unknown;
  type?: unknown;
}

interface JsonApiCollection {
  data?: unknown;
}

function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_GENFEED_API_URL?.trim() || DEFAULT_API_ORIGIN;
  const url = new URL(configured);
  const pathname = url.pathname.replace(/\/+$/, '');

  if (!pathname.endsWith(`/${API_VERSION}`)) {
    url.pathname = `${pathname}/${API_VERSION}`;
  }

  return url.toString().replace(/\/$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCollection(payload: unknown): PublicContentItem[] | null {
  if (!isRecord(payload)) return null;

  const { data } = payload as JsonApiCollection;
  if (!Array.isArray(data)) return null;

  const items: PublicContentItem[] = [];

  for (const candidate of data) {
    if (!isRecord(candidate)) return null;

    const resource = candidate as JsonApiResource;
    if (typeof resource.id !== 'string' || typeof resource.type !== 'string') {
      return null;
    }

    const attributes = isRecord(resource.attributes) ? resource.attributes : {};
    items.push({
      ...attributes,
      id: resource.id,
      resourceType: resource.type,
    });
  }

  return items;
}

function buildPublicContentUrl(
  resource: PublicContentResource,
  query: PublicContentQuery,
): string {
  const url = new URL(`${getApiBaseUrl()}/public/${resource}`);
  url.searchParams.set('page', String(query.page ?? 1));
  url.searchParams.set('limit', String(query.limit ?? DEFAULT_PAGE_SIZE));
  url.searchParams.set('sort', query.sort ?? '-createdAt');
  return url.toString();
}

async function fetchPublicContent(
  resource: PublicContentResource,
  query: PublicContentQuery = {},
): Promise<PublicContentResult> {
  try {
    const response = await fetch(buildPublicContentUrl(resource, query), {
      headers: { Accept: 'application/json' },
      next: { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return {
        items: [],
        message: `Genfeed returned HTTP ${response.status}.`,
        status: 'unavailable',
      };
    }

    const items = parseCollection(await response.json());
    if (!items) {
      return {
        items: [],
        message: 'Genfeed returned an invalid public content response.',
        status: 'unavailable',
      };
    }

    return { items, status: 'success' };
  } catch {
    return {
      items: [],
      message: 'Genfeed could not be reached.',
      status: 'unavailable',
    };
  }
}

function getPublicMediaUrl(
  resource: Exclude<PublicContentResource, 'posts'>,
  id: string,
): string {
  const filenameByResource = {
    images: 'image.jpg',
    musics: 'audio.mp3',
    videos: 'video.mp4',
  } as const;

  return `${getApiBaseUrl()}/public/${resource}/${encodeURIComponent(id)}/${filenameByResource[resource]}`;
}

export {
  fetchPublicContent,
  getApiBaseUrl,
  getPublicMediaUrl,
  parseCollection,
};
