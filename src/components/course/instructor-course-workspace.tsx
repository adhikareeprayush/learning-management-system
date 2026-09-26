"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ImagePlus, Info, MessageSquareText, Save } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FlashBanner } from "@/components/ui/flash-banner";
import { courseCategoryOptions } from "@/lib/course-categories";
import { minorUnitsToInput, parseCoursePriceInput } from "@/lib/course-price-input";
import { formatCoursePrice } from "@/lib/pricing";
import { UPLOAD_ACCEPT, uploadFile } from "@/lib/upload-client";

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
  priceNpr: number;
  outcomes: string[];
  duration: number;
  /** Latest note from an administrator's review; cleared when the course is resubmitted. */
  reviewNote: string | null;
  reviewedAt: string | null;
};

type UiStatus = "Draft" | "Published" | "Review" | "Archived";

function toUiStatus(status: string): UiStatus {
  if (status === "PUBLISHED") return "Published";
  if (status === "IN_REVIEW") return "Review";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

// Restoring an archived course is an administrator's decision.
const statusActions: Record<UiStatus, { label: string; next: "DRAFT" | "IN_REVIEW"; done: string } | null> = {
  Draft: { label: "Submit for review", next: "IN_REVIEW", done: "submitted for review" },
  Review: { label: "Withdraw from review", next: "DRAFT", done: "withdrawn from review and is a draft again" },
  Published: { label: "Unpublish", next: "DRAFT", done: "unpublished and is a draft again" },
  Archived: null,
};

const reviewNoteHeadings: Record<UiStatus, string> = {
  Draft: "An administrator returned this course for changes",
  Review: "Note from the last review",
  Published: "Note from the reviewer",
  Archived: "Note from the administrator",
};

const detailsHints: Record<UiStatus, string> = {
  Draft: "Complete these fields before submitting the course for review.",
  Review: "These details are what the reviewer sees.",
  Published: "What students see on the course page and in the catalog.",
  Archived: "Archived courses are hidden from the catalog.",
};

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

const fieldClass =
  "w-full rounded-xl border border-black/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-purple/20";

export function InstructorCourseWorkspace({ course }: { course: CourseInfo }) {
  const router = useRouter();
  const [status, setStatus] = useState(toUiStatus(course.status));
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [reviewNote, setReviewNote] = useState(course.reviewNote);
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
    outcomes: course.outcomes.join("\n"),
  });

  const price = parseCoursePriceInput(details.priceNpr);
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
      setConfirmUnpublish(false);
      if (next === "IN_REVIEW") setReviewNote(null);
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
    if (!price.ok) {
      setError(price.error);
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
        priceNpr: price.priceNpr,
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
      const { url } = await uploadFile(file, "course-thumbnail");
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
          <span>This course is archived. Ask an administrator if you need it restored to a draft.</span>
        </p>
      ) : null}

      {reviewNote ? (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            status === "Draft" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-black/8 bg-white text-[#324361]"
          }`}
        >
          <MessageSquareText className={`mt-0.5 size-4 shrink-0 ${status === "Draft" ? "" : "text-brand-purple"}`} />
          <div className="min-w-0">
            <p className="font-semibold">
              {reviewNoteHeadings[status]}
              {course.reviewedAt ? (
                <span className="font-normal opacity-75"> · {formatReviewDate(course.reviewedAt)}</span>
              ) : null}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words">{reviewNote}</p>
            {status === "Draft" ? (
              <p className="mt-2 text-xs opacity-80">Make the changes, then submit the course for review again.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {confirmUnpublish ? (
        <div role="alertdialog" aria-labelledby="unpublish-title" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p id="unpublish-title" className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 shrink-0" /> Unpublish “{details.title}”?
          </p>
          <p className="mt-1">
            It leaves the catalog and nobody new can enroll. Students already enrolled keep their access. To publish it
            again you&apos;ll have to submit it for review and wait for an administrator&apos;s approval.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => updateStatus("DRAFT", "unpublished and is a draft again")}
              className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
            >
              {loading ? "Unpublishing…" : "Yes, unpublish"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setConfirmUnpublish(false)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
            >
              Keep it published
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {statusAction ? (
          <button
            type="button"
            disabled={loading || confirmUnpublish}
            onClick={() =>
              status === "Published"
                ? setConfirmUnpublish(true)
                : updateStatus(statusAction.next, statusAction.done)
            }
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

      <form onSubmit={saveDetails} className="grid grid-cols-1 gap-4 rounded-2xl border border-black/5 bg-white p-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <h2 className="font-display text-xl text-brand-navy">Course details</h2>
          <p className="mt-1 text-sm text-muted">{detailsHints[status]}</p>
        </div>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">Title</span>
          <input required maxLength={200} value={details.title} onChange={(event) => setDetails((current) => ({ ...current, title: event.target.value }))} className={fieldClass} />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">Description</span>
          <textarea required maxLength={5000} value={details.description} onChange={(event) => setDetails((current) => ({ ...current, description: event.target.value }))} className={`min-h-28 ${fieldClass}`} />
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
        <p className="text-sm text-muted lg:self-center">
          Students pay: <strong className="text-brand-navy">{price.ok ? formatCoursePrice(price) : "—"}</strong>
        </p>
        <div className="flex flex-col gap-4 rounded-xl border border-black/8 p-3 sm:flex-row sm:items-center lg:col-span-2">
          <div className="relative w-full max-w-[480px] sm:w-64 sm:shrink-0">
            <Image
              src={thumbnail.image}
              alt={`${details.title} thumbnail`}
              width={512}
              height={288}
              sizes="(max-width: 640px) 100vw, 256px"
              className="aspect-video w-full rounded-lg object-cover"
            />
            {thumbnail.uploaded ? null : (
              <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-brand-navy">
                Placeholder image
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted">Thumbnail</p>
            {thumbnail.uploaded ? null : (
              <p className="mt-1 text-xs text-amber-800">No thumbnail yet. Upload one before submitting for review.</p>
            )}
            <label className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-brand-navy hover:bg-surface ${loading ? "pointer-events-none opacity-50" : ""}`}>
              <ImagePlus className="size-4" /> {thumbnail.uploaded ? "Replace image" : "Upload image"}
              <input type="file" accept={UPLOAD_ACCEPT.image} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadThumbnail(file); event.currentTarget.value = ""; }} />
            </label>
          </div>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
