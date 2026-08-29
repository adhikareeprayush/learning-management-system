"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { useDashboardPageHeader } from "@/components/dashboard/dashboard-page-header-context";

/** Persistent page header shell — title updates per route; toolbar stays mounted. */
export function DashboardChrome() {
  const { state } = useDashboardPageHeader();
  const hasTitle = Boolean(state.title);

  if (!hasTitle) return null;

  return (
    <header className="mb-6 w-full sm:mb-8">
      {state.backHref ? (
        <Link
          href={state.backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition hover:text-brand-navy"
        >
          <ArrowLeft className="size-4" />
          {state.backLabel ?? "Back"}
        </Link>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0">
              <h1 className="font-display text-2xl text-brand-navy sm:text-3xl">
                {state.title}
              </h1>
              {state.subtitle ? (
                <p className="mt-1 text-sm text-muted sm:text-base">
                  {state.subtitle}
                </p>
              ) : null}
            </div>
            {state.status ? (
              <div className="shrink-0">{state.status}</div>
            ) : null}
          </div>
        </div>

        <DashboardToolbar />
      </div>
    </header>
  );
}
