"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function PublicError({
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
    <div className="bg-[#f7f8fc] px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-xl rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl text-brand-navy">
              This page couldn&apos;t load
            </h1>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Something went wrong on our side. It&apos;s usually temporary —
              try again, or keep browsing and come back in a moment.
            </p>
            {error.digest ? (
              <p className="mt-2 font-mono text-xs text-muted">
                Reference: {error.digest}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand-gradient px-5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                <RotateCw className="size-4" />
                Try again
              </button>
              <Link
                href="/courses"
                className="inline-flex h-11 items-center rounded-[10px] border border-black/10 bg-white px-5 text-sm font-semibold text-brand-navy transition hover:bg-surface"
              >
                Browse courses
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">
              Still stuck?{" "}
              <Link
                href="/contact"
                className="font-semibold text-brand-purple hover:text-brand-teal"
              >
                Contact us
              </Link>
              {error.digest ? " and include the reference above." : "."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
