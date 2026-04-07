'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResourceOptions<T> {
  defaultValue: T;
  dependencies?: unknown[];
  enabled?: boolean;
  onError?: (error: Error) => void;
}

interface UseResourceReturn<T> {
  data: T;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

export function useResource<T>(
  fetcher: () => Promise<T>,
  options: UseResourceOptions<T>,
): UseResourceReturn<T> {
  const { defaultValue, dependencies = [], enabled = true, onError } = options;

  const [data, setData] = useState<T>(defaultValue);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasFetched = useRef(false);

  const doFetch = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await fetcher();
        setData(result);
      } catch (err) {
        const fetchError = err instanceof Error ? err : new Error(String(err));
        setError(fetchError);
        onError?.(fetchError);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetcher],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const controller = new AbortController();

    void doFetch(hasFetched.current);
    hasFetched.current = true;

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...dependencies]);

  const refresh = useCallback(async () => {
    await doFetch(true);
  }, [doFetch]);

  return { data, error, isLoading, isRefreshing, refresh };
}
