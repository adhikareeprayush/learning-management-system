"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { FlashBanner } from "@/components/ui/flash-banner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { CourseReviewsBundle } from "@/lib/course-reviews";

type CourseReviewsProps = {
  courseId: string;
  variant?: "default" | "compact";
  showInstructorView?: boolean;
};

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="rounded-lg p-1 transition hover:bg-white"
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={`size-6 ${
              star <= value
                ? "fill-[#f5b942] text-[#f5b942]"
                : "text-black/15"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingBreakdown({
  distribution,
  reviewCount,
}: {
  distribution: number[];
  reviewCount: number;
}) {
  if (reviewCount === 0) return null;

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = distribution[stars - 1] ?? 0;
        const percent = reviewCount === 0 ? 0 : Math.round((count / reviewCount) * 100);
        return (
          <div key={stars} className="flex items-center gap-2 text-xs">
            <span className="w-8 font-medium text-muted">{stars}★</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-brand-teal transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-8 text-right text-muted">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CourseReviews({
  courseId,
  variant = "default",
  showInstructorView = false,
}: CourseReviewsProps) {
  const [bundle, setBundle] = useState<CourseReviewsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as CourseReviewsBundle;
        setBundle(data);
        if (data.userReview) {
          setRating(data.userReview.rating);
          setComment(data.userReview.comment ?? "");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not submit review.");
      }
      setBundle(data as CourseReviewsBundle);
      setFlash(
        bundle?.userReview
          ? "Your review has been updated."
          : "Thanks for your review!",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function removeReview() {
    if (!confirm("Remove your review for this course?")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not remove review.");
      }
      setBundle(data as CourseReviewsBundle);
      setRating(5);
      setComment("");
      setFlash("Your review was removed.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not remove review.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const reviews = bundle?.reviews ?? [];
  const avgRating = bundle?.rating ?? 0;
  const reviewCount = bundle?.reviewCount ?? 0;
  const canReview = bundle?.canReview ?? false;
  const hasCompleted = bundle?.hasCompleted ?? false;
  const isEnrolled = bundle?.isEnrolled ?? false;
  const userReview = bundle?.userReview ?? null;

  return (
    <section
      id="course-reviews"
      className={
        variant === "compact"
          ? "rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          : "rounded-3xl border border-black/5 bg-white p-6 md:p-8"
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-brand-navy">
            {showInstructorView ? "Student reviews" : "Course reviews"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {reviewCount === 0
              ? "No reviews yet."
              : `${reviewCount} review${reviewCount === 1 ? "" : "s"}`}
            {showInstructorView ? " from graduates" : ""}
          </p>
        </div>
        {avgRating > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2">
            <Star className="size-5 fill-[#f5b942] text-[#f5b942]" />
            <span className="text-lg font-semibold text-brand-navy">
              {avgRating}
            </span>
            <span className="text-sm text-muted">average</span>
          </div>
        ) : null}
      </div>

      {bundle && reviewCount > 0 ? (
        <div className="mt-5 max-w-md">
          <RatingBreakdown
            distribution={bundle.distribution}
            reviewCount={reviewCount}
          />
        </div>
      ) : null}

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      {!showInstructorView && isEnrolled && !hasCompleted ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Finish all lessons in this course to unlock the review form.
        </div>
      ) : null}

      {!showInstructorView && canReview ? (
        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-2xl border border-black/5 bg-surface/40 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-brand-navy">
              {userReview ? "Update your review" : "Write a review"}
            </p>
            {userReview ? (
              <button
                type="button"
                onClick={() => void removeReview()}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            ) : null}
          </div>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you learn? Was the pacing right? Would you recommend it?"
            className="mt-3 min-h-24 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          <Button submit disabled={submitting} className="mt-3">
            {submitting
              ? "Saving…"
              : userReview
                ? "Update review"
                : "Submit review"}
          </Button>
        </form>
      ) : null}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-muted">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-muted">
            {showInstructorView
              ? "Reviews will appear here after students complete the course."
              : "Be the first to review this course after you graduate."}
          </p>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-black/5 p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={review.student.name}
                    image={review.student.image}
                    size="sm"
                  />
                  <div>
                    <p className="font-semibold text-[#324361]">
                      {review.student.name}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${
                        i < review.rating
                          ? "fill-[#f5b942] text-[#f5b942]"
                          : "text-black/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {review.comment ? (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {review.comment}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
