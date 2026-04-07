'use client';

import {
  type GalleryItem,
  type GalleryQueryParams,
  fetchGallery,
} from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

interface UseGalleryListOptions {
  type: string;
  queryParams?: GalleryQueryParams;
}

interface UseGalleryListResult {
  items: GalleryItem[];
  isLoading: boolean;
  error: string | null;
}

function useGalleryList({
  type,
  queryParams = {},
}: UseGalleryListOptions): UseGalleryListResult {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serializedParams = JSON.stringify(queryParams);

  const loadItems = useCallback(
    async (signal: AbortSignal) => {
      try {
        setIsLoading(true);
        setError(null);

        const params: GalleryQueryParams = JSON.parse(serializedParams);
        const response = await fetchGallery(type, params, signal);

        if (signal.aborted) return;

        const data = Array.isArray(response) ? response : (response.data ?? []);

        setItems(data);
      } catch (err) {
        if (signal.aborted) return;

        const message =
          err instanceof Error ? err.message : 'Failed to load content';
        setError(message);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [type, serializedParams],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadItems(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadItems]);

  return { items, isLoading, error };
}

export { useGalleryList };
export type { UseGalleryListResult, UseGalleryListOptions };
