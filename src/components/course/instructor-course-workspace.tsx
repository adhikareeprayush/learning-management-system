"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, Save } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FlashBanner } from "@/components/ui/flash-banner";

type CourseInfo = {
  id: string;
  slug: string;
  title: string;
  image: string;
  status: string;
  description: string;
  category: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  priceCents: number;
  outcomes: string[];
  duration: number;
};

function toUiStatus(status: string): "Draft" | "Published" | "Review" | "Archived" {
  if (status === "PUBLISHED") return "Published";
  if (status === "IN_REVIEW") return "Review";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

export function InstructorCourseWorkspace({ course }: { course: CourseInfo }) {
  const router = useRouter();
  const [status, setStatus] = useState(toUiStatus(course.status));
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState({
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    price: (course.priceCents / 100).toFixed(2),
    outcomes: course.outcomes.join("\n"),
    thumbnail: course.image,
  });

  async function updateStatus(next: "DRAFT" | "PUBLISHED" | "IN_REVIEW") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setStatus(toUiStatus(next));
      setFlash(`“${course.title}” marked as ${toUiStatus(next)}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setLoading(false);
    }
  }

  async function patchCourse(payload: Record<string, unknown>) {
    const response = await fetch(`/api/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Could not save course");
    return data;
  }

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await patchCourse({
        title: details.title,
        description: details.description,
        category: details.category,
        level: details.level,
        price: Math.round(Number(details.price || 0) * 100),
        thumbnail: details.thumbnail,
        outcomes: details.outcomes.split("\n").map((item) => item.trim()).filter(Boolean),
      });
      setFlash("Course details saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save course");
    } finally {
      setLoading(false);
    }
  }

  async function uploadThumbnail(file: File) {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("provider", "imagekit");
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not upload thumbnail");
      const thumbnail = String(data.upload.url);
      await patchCourse({ thumbnail });
      setDetails((current) => ({ ...current, thumbnail }));
      setFlash("Course thumbnail uploaded.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload thumbnail");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title={course.title}
        subtitle="Instructor course workspace"
        status={
          <span
            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
              status === "Published"
                ? "bg-emerald-50 text-emerald-700"
                : status === "Review"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {status}
          </span>
        }
      />

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {status === "Published" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => updateStatus("DRAFT")}
            className="rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface disabled:opacity-50"
          >
            Unpublish
          </button>
        ) : null}
        {status === "Draft" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => updateStatus("IN_REVIEW")}
            className="rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-brand-navy transition hover:bg-surface disabled:opacity-50"
          >
            Submit for review
          </button>
        ) : null}
        <Link
          href="/instructor/courses/create"
          className="rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-brand-navy transition hover:bg-surface"
        >
          New course
        </Link>
      </div>

      <form onSubmit={saveDetails} className="grid gap-4 rounded-2xl border border-black/5 bg-white p-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <h2 className="font-display text-xl text-brand-navy">Course details</h2>
          <p className="mt-1 text-sm text-muted">Complete these fields before submitting the course for review.</p>
        </div>
        <label className="block lg:col-span-2"><span className="mb-1 block text-xs font-semibold text-muted">Title</span><input required value={details.title} onChange={(event) => setDetails((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
        <label className="block lg:col-span-2"><span className="mb-1 block text-xs font-semibold text-muted">Description</span><textarea required value={details.description} onChange={(event) => setDetails((current) => ({ ...current, description: event.target.value }))} className="min-h-28 w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Category</span><input required value={details.category} onChange={(event) => setDetails((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Level</span><select value={details.level} onChange={(event) => setDetails((current) => ({ ...current, level: event.target.value as CourseInfo["level"] }))} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20"><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Price (USD)</span><input type="number" min="0" step="0.01" value={details.price} onChange={(event) => setDetails((current) => ({ ...current, price: event.target.value }))} className="w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
        <div className="rounded-xl border border-black/8 p-3">
          <p className="text-xs font-semibold text-muted">Thumbnail</p>
          <label className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-brand-navy hover:bg-surface ${loading ? "pointer-events-none opacity-50" : ""}`}><ImagePlus className="size-4" /> Upload image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadThumbnail(file); event.currentTarget.value = ""; }} /></label>
        </div>
        <label className="block lg:col-span-2"><span className="mb-1 block text-xs font-semibold text-muted">Learning outcomes (one per line)</span><textarea value={details.outcomes} onChange={(event) => setDetails((current) => ({ ...current, outcomes: event.target.value }))} className="min-h-28 w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20" /></label>
        <div className="flex justify-end lg:col-span-2"><button disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#083f9b] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="size-4" /> {loading ? "Saving…" : "Save details"}</button></div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Link
          href={`/instructor/courses/${course.slug}/lessons`}
          className="rounded-2xl border border-black/5 bg-white p-5 font-semibold text-[#324361] transition hover:border-brand-purple/25 hover:bg-surface"
        >
          Manage lessons →
        </Link>
        <Link
          href={`/instructor/courses/${course.slug}/assignments`}
          className="rounded-2xl border border-black/5 bg-white p-5 font-semibold text-[#324361] transition hover:border-brand-purple/25 hover:bg-surface"
        >
          Assignments →
        </Link>
        <Link
          href={`/instructor/courses/${course.slug}/students`}
          className="rounded-2xl border border-black/5 bg-white p-5 font-semibold text-[#324361] transition hover:border-brand-purple/25 hover:bg-surface"
        >
          Students →
        </Link>
        <Link
          href={`/instructor/courses/${course.slug}/reviews`}
          className="rounded-2xl border border-black/5 bg-white p-5 font-semibold text-[#324361] transition hover:border-brand-purple/25 hover:bg-surface"
        >
          Reviews →
        </Link>
      </div>
      <Image
        src={details.thumbnail}
        alt={`${details.title} thumbnail`}
        width={1600}
        height={686}
        sizes="(max-width: 1024px) 100vw, 80vw"
        className="aspect-[21/9] w-full rounded-2xl object-cover"
      />
    </div>
  );
}
