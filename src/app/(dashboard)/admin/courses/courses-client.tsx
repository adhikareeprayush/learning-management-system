"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FlashBanner } from "@/components/ui/flash-banner";

type CourseStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

export type AdminCourse = {
  id: string;
  slug: string;
  title: string;
  category: string;
  instructor: string;
  priceCents: number;
  students: number;
  lessons: number;
  status: CourseStatus;
};

const labels: Record<CourseStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "Review",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const statusStyles: Record<CourseStatus, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  IN_REVIEW: "bg-amber-50 text-amber-800",
  DRAFT: "bg-slate-100 text-slate-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

export default function AdminCoursesClient({
  initialCourses,
  initialQuery = "",
  initialStatus = "ALL",
  title = "Courses",
  subtitle = "Review and manage every course on the platform.",
}: {
  initialCourses: AdminCourse[];
  initialQuery?: string;
  initialStatus?: "ALL" | CourseStatus;
  title?: string;
  subtitle?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<"ALL" | CourseStatus>(initialStatus);
  const [courses, setCourses] = useState(initialCourses);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (status !== "ALL" && course.status !== status) return false;
      if (!normalized) return true;
      return [course.title, course.category, course.instructor].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [query, status, courses]);

  async function setCourseStatus(course: AdminCourse, next: CourseStatus) {
    setBusyId(course.id);
    setError(null);
    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update course");
      setCourses((current) => current.map((item) => item.id === course.id ? { ...item, status: next } : item));
      setFlash(`“${course.title}” marked as ${labels[next]}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update course");
    } finally {
      setBusyId(null);
    }
  }

  function renderCourseActions(course: AdminCourse) {
    return (
      <div className="flex flex-wrap gap-2">
        {course.status === "IN_REVIEW" ? (
          <>
            <button
              disabled={busyId === course.id}
              onClick={() => setCourseStatus(course, "PUBLISHED")}
              className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              disabled={busyId === course.id}
              onClick={() => setCourseStatus(course, "DRAFT")}
              className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Return to draft
            </button>
          </>
        ) : null}
        {course.status === "PUBLISHED" ? (
          <button
            disabled={busyId === course.id}
            onClick={() => setCourseStatus(course, "ARCHIVED")}
            className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Archive
          </button>
        ) : null}
        {course.status === "ARCHIVED" ? (
          <button
            disabled={busyId === course.id}
            onClick={() => setCourseStatus(course, "DRAFT")}
            className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-surface disabled:opacity-50"
          >
            Restore
          </button>
        ) : null}
        {course.status === "PUBLISHED" ? (
          <Link
            href={`/courses/${course.slug}`}
            className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-surface"
          >
            View
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader title={title} subtitle={subtitle} />
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted"><BookOpen className="size-4 text-brand-purple" /><span><strong className="text-brand-navy">{filtered.length}</strong> courses shown</span></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter courses…" className="h-10 w-full rounded-xl border border-black/8 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-purple/40" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | CourseStatus)} className="h-10 rounded-xl border border-black/8 bg-white px-3 text-sm outline-none focus:border-brand-purple/40"><option value="ALL">All statuses</option><option value="IN_REVIEW">Review</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
        </div>
      </div>
      <div className="space-y-3 lg:hidden">
        {filtered.map((course) => (
          <article
            key={course.id}
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[#324361]">{course.title}</p>
                <p className="mt-1 text-sm text-muted">{course.instructor}</p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${statusStyles[course.status]}`}
              >
                {labels[course.status]}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
              <div>
                <dt className="font-medium text-[#324361]">Category</dt>
                <dd>{course.category || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-[#324361]">Price</dt>
                <dd>${(course.priceCents / 100).toFixed(2)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="font-medium text-[#324361]">Content</dt>
                <dd>
                  {course.lessons} lessons · {course.students} students
                </dd>
              </div>
            </dl>
            <div className="mt-4">{renderCourseActions(course)}</div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-surface/80 text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Instructor</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Content</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => (
                <tr
                  key={course.id}
                  className="border-t border-black/5 hover:bg-surface/50"
                >
                  <td className="px-5 py-4 font-medium text-[#324361]">
                    {course.title}
                  </td>
                  <td className="px-5 py-4 text-muted">{course.instructor}</td>
                  <td className="px-5 py-4 text-muted">
                    {course.category || "—"}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    ${(course.priceCents / 100).toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {course.lessons} lessons · {course.students} students
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusStyles[course.status]}`}
                    >
                      {labels[course.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">{renderCourseActions(course)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length === 0 ? <p className="text-center text-sm text-muted">No courses match these filters.</p> : null}
    </div>
  );
}
