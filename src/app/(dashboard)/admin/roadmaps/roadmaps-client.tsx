"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Compass, Plus, Search, Star } from "lucide-react";
import {
  RoadmapStatusBadge,
  roadmapStatusLabels,
} from "@/components/admin/roadmap-badges";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import type { AdminRoadmapSummary } from "@/lib/roadmap-admin";

type StatusFilter = "ALL" | AdminRoadmapSummary["status"];

// Fixed time zone keeps server and client renders identical.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function courseSummary(roadmap: AdminRoadmapSummary) {
  const total = `${roadmap.courseCount} ${roadmap.courseCount === 1 ? "course" : "courses"}`;
  if (roadmap.publishedCourseCount === roadmap.courseCount) return total;
  return `${total} · ${roadmap.publishedCourseCount} published`;
}

function learnerSummary(roadmap: AdminRoadmapSummary) {
  const enrolled = `${roadmap.enrollmentCount} enrolled`;
  return roadmap.certificateCount > 0
    ? `${enrolled} · ${roadmap.certificateCount} certified`
    : enrolled;
}

function RoadmapActions({ roadmap }: { roadmap: AdminRoadmapSummary }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/admin/roadmaps/${roadmap.id}`}
        className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-surface"
      >
        Edit
      </Link>
      {roadmap.status === "PUBLISHED" ? (
        <Link
          href={`/roadmaps/${roadmap.slug}`}
          className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-surface"
        >
          View
        </Link>
      ) : null}
    </div>
  );
}

export default function AdminRoadmapsClient({
  initialRoadmaps,
  initialFlash,
}: {
  initialRoadmaps: AdminRoadmapSummary[];
  initialFlash: string | null;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [flash, setFlash] = useState(initialFlash);

  useEffect(() => {
    // Drop the one-shot ?deleted flag so a reload doesn't repeat the banner.
    if (initialFlash) window.history.replaceState(null, "", "/admin/roadmaps");
  }, [initialFlash]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return initialRoadmaps.filter((roadmap) => {
      if (status !== "ALL" && roadmap.status !== status) return false;
      if (!normalized) return true;
      return [roadmap.title, roadmap.slug, roadmap.category ?? ""].some((value) =>
        value.toLowerCase().includes(normalized),
      );
    });
  }, [initialRoadmaps, query, status]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Roadmaps"
        subtitle="Curate learning paths that bundle courses into a guided sequence."
      />
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Compass className="size-4 text-brand-purple" />
          <span>
            <strong className="text-brand-navy">{filtered.length}</strong>{" "}
            {filtered.length === 1 ? "roadmap" : "roadmaps"} shown
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter roadmaps…"
              aria-label="Filter roadmaps"
              className="h-10 w-full rounded-xl border border-black/8 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-purple/40"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            aria-label="Filter by status"
            className="h-10 rounded-xl border border-black/8 bg-white px-3 text-sm outline-none focus:border-brand-purple/40"
          >
            <option value="ALL">All statuses</option>
            {(Object.keys(roadmapStatusLabels) as AdminRoadmapSummary["status"][]).map(
              (value) => (
                <option key={value} value={value}>
                  {roadmapStatusLabels[value]}
                </option>
              ),
            )}
          </select>
          <Button href="/admin/roadmaps/new" className="h-10 px-4 text-sm">
            <Plus className="size-4" />
            New roadmap
          </Button>
        </div>
      </div>

      {initialRoadmaps.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <Compass className="mx-auto size-8 text-brand-purple" />
          <p className="mt-3 font-semibold text-brand-navy">No roadmaps yet</p>
          <p className="mt-1 text-sm text-muted">
            Create a roadmap to group courses into a guided learning path.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filtered.map((roadmap) => (
              <article
                key={roadmap.id}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#324361]">{roadmap.title}</p>
                    <p className="mt-1 truncate font-mono text-xs text-muted">
                      /roadmaps/{roadmap.slug}
                    </p>
                  </div>
                  <RoadmapStatusBadge status={roadmap.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                  <div>
                    <dt className="font-medium text-[#324361]">Courses</dt>
                    <dd>{courseSummary(roadmap)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#324361]">Learners</dt>
                    <dd>{learnerSummary(roadmap)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-medium text-[#324361]">Updated</dt>
                    <dd>{dateFormatter.format(new Date(roadmap.updatedAt))}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <RoadmapActions roadmap={roadmap} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-surface/80 text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Roadmap</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Courses</th>
                    <th className="px-5 py-3 font-medium">Learners</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((roadmap) => (
                    <tr
                      key={roadmap.id}
                      className="border-t border-black/5 hover:bg-surface/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/roadmaps/${roadmap.id}`}
                            className="font-medium text-[#324361] hover:text-brand-purple"
                          >
                            {roadmap.title}
                          </Link>
                          {roadmap.featured ? (
                            <Star
                              className="size-3.5 fill-amber-400 text-amber-400"
                              aria-label="Featured"
                            />
                          ) : null}
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-muted">
                          /roadmaps/{roadmap.slug}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <RoadmapStatusBadge status={roadmap.status} />
                      </td>
                      <td className="px-5 py-4 text-muted">{courseSummary(roadmap)}</td>
                      <td className="px-5 py-4 text-muted">{learnerSummary(roadmap)}</td>
                      <td className="px-5 py-4 text-muted">
                        {dateFormatter.format(new Date(roadmap.updatedAt))}
                      </td>
                      <td className="px-5 py-4">
                        <RoadmapActions roadmap={roadmap} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted">
              No roadmaps match these filters.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
