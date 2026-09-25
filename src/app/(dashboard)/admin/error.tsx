"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-8">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
          <AlertTriangle className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-brand-navy">
            This admin page couldn&apos;t load
          </h2>
          <p className="mt-1 text-sm text-muted">
            Something went wrong while loading data. It may be temporary — try again, or
            head back to the admin overview.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-muted">Reference: {error.digest}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white transition hover:bg-brand-navy/90"
            >
              <RotateCw className="size-4" />
              Try again
            </button>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center rounded-xl border border-black/8 bg-white px-4 text-sm font-semibold text-brand-navy transition hover:bg-surface"
            >
              Admin overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
