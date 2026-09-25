"use client";

import { useCallback, useEffect, useState } from "react";

type LiveDataOptions = {
  intervalMs?: number;
  enabled?: boolean;
};

export function useLiveData<T>(
  url: string,
  initialData: T,
  { intervalMs = 30_000, enabled = true }: LiveDataOptions = {},
) {
  // Polled data is only valid for the url + server data it was fetched against;
  // when either changes (new period, router.refresh) we fall back to initialData.
  const [fetched, setFetched] = useState<{
    url: string;
    base: T;
    data: T;
  } | null>(null);
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  const data =
    fetched && fetched.url === url && fetched.base === initialData
      ? fetched.data
      : initialData;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return;
      const json = (await response.json()) as {
        data?: T;
        refreshedAt?: string;
      };
      const next = json.data ?? (json as T);
      setFetched({ url, base: initialData, data: next });
      setRefreshedAt(
        json.refreshedAt ? new Date(json.refreshedAt) : new Date(),
      );
    } finally {
      setRefreshing(false);
    }
  }, [url, enabled, initialData]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, intervalMs, enabled]);

  return { data, refreshedAt, refreshing, refresh };
}
