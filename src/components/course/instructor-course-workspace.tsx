"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, Info, Save } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FlashBanner } from "@/components/ui/flash-banner";
import { courseCategoryOptions } from "@/lib/course-categories";
import { minorUnitsToInput, parseCoursePriceInput } from "@/lib/course-price-input";
import { formatCoursePrice } from "@/lib/pricing";

type CourseInfo = {
  id: string;
  slug: string;
  title: string;
  /** Stored thumbnail (null when none has been uploaded). */
  thumbnail: string | null;
  /** Display URL for the thumbnail, falling back to the default course image. */
  image: string;
  status: string;
  description: string;
  category: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  priceCents: number;
  priceNpr: number;
  outcomes: string[];
  duration: number;
};

type UiStatus = "Draft" | "Published" | "Review" | "Archived";

function toUiStatus(status: string): UiStatus {
  if (status === "PUBLISHED") return "Published";
  if (status === "IN_REVIEW") return "Review";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

const statusActions: Record<UiStatus, { label: string; next: "DRAFT" | "IN_REVIEW"; done: string } | null> = {
  Draft: { label: "Submit for review", next: "IN_REVIEW", done: "submitted for review" },
  Review: { label: "Withdraw from review", next: "DRAFT", done: "withdrawn from review and is a draft again" },
  Published: { label: "Unpublish", next: "DRAFT", done: "unpublished and is a draft again" },
  Archived: { label: "Restore to draft", next: "DRAFT", done: "restored to a draft" },
};

const fieldClass =
  "w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20";

export function InstructorCourseWorkspace({ course }: { course: CourseInfo }) {
  const router = useRouter();
  const [status, setStatus] = useState(toUiStatus(course.status));
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [thumbnail, setThumbnail] = useState({
    uploaded: Boolean(course.thumbnail),
    image: course.image,
  });
  const [details, setDetails] = useState({
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    priceNpr: minorUnitsToInput(course.priceNpr),
    priceUsd: minorUnitsToInput(course.priceCents),
    outcomes: course.outcomes.join("\n"),
  });

  const prices = parseCoursePriceInput({ npr: details.priceNpr, usd: details.priceUsd });
  const statusAction = statusActions[status];

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

  async function updateStatus(next: "DRAFT" | "IN_REVIEW", done: string) {
    setLoading(true);
    setError(null);
    try {
      await patchCourse({ status: next });
      setStatus(toUiStatus(next));
      setFlash(`“${details.title}” was ${done}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setLoading(false);
    }
  }

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!prices.ok) {
      setError(prices.error);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await patchCourse({
        title: details.title,
        description: details.description,
        category: details.category,
        level: details.level,
        price: prices.price,
        priceNpr: prices.priceNpr,
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
      form.set("purpose", "course-thumbnail");
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not upload thumbnail");
      const url = String(data.upload.url);
      await patchCourse({ thumbnail: url });
      setThumbnail({ uploaded: true, image: url });
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

      {status === "Published" ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            This course is live. Changes you save here or to its lessons and assignments are visible to students
            immediately and are not reviewed again.
          </span>
        </p>
      ) : status === "Review" ? (
        <p className="flex items-start gap-2 rounded-xl border border-black/8 bg-white px-4 py-3 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-purple" />
          <span>An administrator is reviewing this course. Withdraw it if you need to rework it before approval.</span>
        </p>
      ) : status === "Archived" ? (
        <p className="flex items-start gap-2 rounded-xl border border-black/8 bg-white px-4 py-3 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-purple" />
          <span>This course is archived. Restore it to a draft to edit and resubmit it for review.</span>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {statusAction ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => updateStatus(statusAction.next, statusAction.done)}
            className="rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-brand-navy transition hover:bg-surface disabled:opacity-50"
          >
            {statusAction.label}
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
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">Title</span>
          <input required value={details.title} onChange={(event) => setDetails((current) => ({ ...current, title: event.target.value }))} className={fieldClass} />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">Description</span>
          <textarea required value={details.description} onChange={(event) => setDetails((current) => ({ ...current, description: event.target.value }))} className={`min-h-28 ${fieldClass}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Category</span>
          <select required value={details.category} onChange={(event) => setDetails((current) => ({ ...current, category: event.target.value }))} className={`bg-white ${fieldClass}`}>
            {details.category ? null : <option value="">Choose a category</option>}
            {courseCategoryOptions(course.category).map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Level</span>
          <select value={details.level} onChange={(event) => setDetails((current) => ({ ...current, level: event.target.value as CourseInfo["level"] }))} className={`bg-white ${fieldClass}`}>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Price (NPR)</span>
          <input type="number" min="0" step="1" inputMode="numeric" placeholder="0 = free" value={details.priceNpr} onChange={(event) => setDetails((current) => ({ ...current, priceNpr: event.target.value }))} className={fieldClass} />
          <span className="mt-1 block text-xs text-muted">In rupees. Leave empty or 0 for free; paid courses start at Rs 10.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">List price (USD, optional)</span>
          <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={details.priceUsd} onChange={(event) => setDetails((current) => ({ ...current, priceUsd: event.target.value }))} className={fieldClass} />
          <span className="mt-1 block text-xs text-muted">Only charged (converted to NPR) when no NPR price is set.</span>
        </label>
        <p className="text-sm text-muted lg:col-span-2">
          Students pay: <strong className="text-brand-navy">{prices.ok ? formatCoursePrice(prices) : "—"}</strong>
        </p>
        <div className="rounded-xl border border-black/8 p-3 lg:col-span-2">
          <p className="text-xs font-semibold text-muted">Thumbnail</p>
          {thumbnail.uploaded ? null : (
            <p className="mt-1 text-xs text-amber-800">No thumbnail yet. Upload one before submitting for review.</p>
          )}
          <label className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-brand-navy hover:bg-surface ${loading ? "pointer-events-none opacity-50" : ""}`}>
            <ImagePlus className="size-4" /> {thumbnail.uploaded ? "Replace image" : "Upload image"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadThumbnail(file); event.currentTarget.value = ""; }} />
          </label>
        </div>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">Learning outcomes (one per line)</span>
          <textarea value={details.outcomes} onChange={(event) => setDetails((current) => ({ ...current, outcomes: event.target.value }))} className={`min-h-28 ${fieldClass}`} />
        </label>
        <div className="flex justify-end lg:col-span-2">
          <button disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <Save className="size-4" /> {loading ? "Saving…" : "Save details"}
          </button>
        </div>
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
      <div className="relative">
        <Image
          src={thumbnail.image}
          alt={`${details.title} thumbnail`}
          width={1600}
          height={686}
          sizes="(max-width: 1024px) 100vw, 80vw"
          className="aspect-[21/9] w-full rounded-2xl object-cover"
        />
        {thumbnail.uploaded ? null : (
          <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-brand-navy">
            Placeholder image
          </span>
        )}
      </div>
    </div>
  );
}
