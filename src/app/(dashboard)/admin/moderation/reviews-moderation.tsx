"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, MessageSquareText, Star, Trash2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FlashBanner } from "@/components/ui/flash-banner";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { ModerationReview } from "@/lib/course-reviews";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function ReviewsModeration({
  initialReviews,
  limit,
}: {
  initialReviews: ModerationReview[];
  limit: number;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deleteReview(review: ModerationReview) {
    setBusyId(review.id);
    setError(null);
    setFlash(null);
    try {
      const response = await fetch(
        `/api/courses/${review.course.id}/reviews?reviewId=${encodeURIComponent(review.id)}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not delete the review");
      setReviews((current) => current.filter((item) => item.id !== review.id));
      setConfirmingId(null);
      setFlash(`Deleted ${review.student.name}'s review of “${review.course.title}”.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the review");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <DashboardHeader
        title="Moderation"
        subtitle="Remove reviews that break the rules. Authors can also delete their own."
      />
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 text-sm text-muted">
        <MessageSquareText className="size-4 text-brand-purple" />
        <span>
          {reviews.length === 0
            ? "No reviews yet."
            : `${reviews.length} review${reviews.length === 1 ? "" : "s"}${
                initialReviews.length >= limit ? ` (newest ${limit} shown)` : ""
              }`}
        </span>
      </div>

      <ul className="space-y-3">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <UserAvatar name={review.student.name} image={review.student.image} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#324361]">
                    {review.student.name}
                    {review.student.email ? (
                      <span className="ml-1.5 font-normal text-muted">{review.student.email}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    <Link
                      href={`/admin/courses/${review.course.id}`}
                      className="font-medium text-brand-purple hover:text-brand-teal"
                    >
                      {review.course.title}
                    </Link>{" "}
                    · {dateFormatter.format(new Date(review.createdAt))}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`size-4 ${
                        index < review.rating ? "fill-[#f5b942] text-[#f5b942]" : "text-black/10"
                      }`}
                    />
                  ))}
                </span>
                {confirmingId !== review.id ? (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => setConfirmingId(review.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
            {review.comment ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#324361]">
                {review.comment}
              </p>
            ) : (
              <p className="mt-3 text-sm italic text-muted">No comment, rating only.</p>
            )}
            {confirmingId === review.id ? (
              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                <p>Delete this review permanently? The course rating updates right away.</p>
                <div className="flex shrink-0 justify-end gap-2">
                  <button
                    type="button"
                    disabled={busyId === review.id}
                    onClick={() => setConfirmingId(null)}
                    className="rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busyId === review.id}
                    onClick={() => void deleteReview(review)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    Delete review
                    {busyId === review.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
