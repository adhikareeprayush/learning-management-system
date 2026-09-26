"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { CourseStatusBadge } from "@/components/admin/roadmap-badges";
import { formatDuration } from "@/lib/format";
import { formatCoursePrice } from "@/lib/pricing";
import type { AdminRoadmapCourse } from "@/lib/roadmap-admin";

function CourseMeta({ course }: { course: AdminRoadmapCourse }) {
  const parts = [
    course.instructorName,
    course.duration > 0 ? formatDuration(course.duration) : null,
    formatCoursePrice(course),
  ].filter(Boolean);
  return <p className="mt-0.5 truncate text-xs text-muted">{parts.join(" · ")}</p>;
}

const iconButton =
  "grid size-8 place-items-center rounded-lg border border-black/8 text-muted transition hover:bg-surface hover:text-brand-navy disabled:pointer-events-none disabled:opacity-40";

export function RoadmapCoursePicker({
  selected,
  options,
  onChange,
  disabled = false,
}: {
  selected: AdminRoadmapCourse[];
  options: AdminRoadmapCourse[];
  onChange: (next: AdminRoadmapCourse[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");

  const available = useMemo(() => {
    const selectedIds = new Set(selected.map((course) => course.id));
    const normalized = query.trim().toLowerCase();
    return options.filter((course) => {
      if (selectedIds.has(course.id)) return false;
      if (!normalized) return true;
      return [course.title, course.instructorName, course.category ?? ""].some(
        (value) => value.toLowerCase().includes(normalized),
      );
    });
  }, [options, selected, query]);

  const publishedCount = selected.filter(
    (course) => course.status === "PUBLISHED",
  ).length;
  const totalMinutes = selected
    .filter((course) => course.status === "PUBLISHED")
    .reduce((sum, course) => sum + course.duration, 0);

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-brand-navy">
          Path order{" "}
          <span className="font-normal text-muted">
            · {selected.length} {selected.length === 1 ? "course" : "courses"},{" "}
            {publishedCount} published
            {totalMinutes > 0 ? ` · ${formatDuration(totalMinutes)} of published content` : ""}
          </span>
        </h3>
        <p className="mt-1 text-xs text-muted">
          Learners only see published courses. Drafts stay in the path but hidden
          until they are published.
        </p>

        {selected.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-black/10 bg-surface/50 px-4 py-6 text-center text-sm text-muted">
            No courses yet. Add courses from the list below.
          </p>
        ) : (
          <ol className="mt-3 divide-y divide-black/5 rounded-xl border border-black/8">
            {selected.map((course, index) => (
              <li key={course.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-brand-navy">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#324361]">
                      {course.title}
                    </p>
                    <CourseStatusBadge status={course.status} />
                  </div>
                  <CourseMeta course={course} />
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className={iconButton}
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${course.title} up`}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    disabled={disabled || index === selected.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${course.title} down`}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={`${iconButton} hover:text-red-700`}
                    disabled={disabled}
                    onClick={() =>
                      onChange(selected.filter((item) => item.id !== course.id))
                    }
                    aria-label={`Remove ${course.title}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-brand-navy">Add courses</h3>
          <label className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search courses…"
              aria-label="Search courses to add"
              className="h-9 w-full rounded-xl border border-black/8 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-purple/40"
            />
          </label>
        </div>
        {available.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {options.length === 0
              ? "There are no courses to add yet."
              : options.length === selected.length
                ? "Every course is already in this roadmap."
                : "No courses match your search."}
          </p>
        ) : (
          <ul className="mt-3 max-h-72 divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/8">
            {available.map((course) => (
              <li key={course.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#324361]">
                      {course.title}
                    </p>
                    <CourseStatusBadge status={course.status} />
                  </div>
                  <CourseMeta course={course} />
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange([...selected, course])}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-surface disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
