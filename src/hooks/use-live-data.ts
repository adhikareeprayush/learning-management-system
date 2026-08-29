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
  const [data, setData] = useState<T>(initialData);
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData, url]);

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
      setData(next);
      setRefreshedAt(
        json.refreshedAt ? new Date(json.refreshedAt) : new Date(),
      );
    } finally {
      setRefreshing(false);
    }
  }, [url, enabled]);

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
