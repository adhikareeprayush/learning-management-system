import Link from "next/link";
import { ArrowRight, Award, HelpCircle, Star } from "lucide-react";

type Quiz = {
  id: string;
  title: string;
  lessonId: string;
  lessonTitle: string;
};

type CertificateProgressProps = {
  variant: "course" | "lesson";
  courseSlug: string;
  courseTitle: string;
  progress: number;
  /** Every lesson done — what the review form requires, not just a certificate. */
  lessonsComplete: boolean;
  hasCertificate: boolean;
  remainingQuizzes: Quiz[];
};

/**
 * Certificate status for an enrolled course: ready to view, or which quizzes
 * still stand between the learner and it (every lesson + every quiz passed).
 * A certificate can predate lessons added later, so "finished" also needs
 * every current lesson complete.
 */
export function CertificateProgress({
  variant,
  courseSlug,
  courseTitle,
  progress,
  lessonsComplete,
  hasCertificate,
  remainingQuizzes,
}: CertificateProgressProps) {
  if (hasCertificate && !lessonsComplete) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal/20 bg-[#e8faf6] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <Award className="mt-0.5 size-5 shrink-0 text-brand-teal" />
          <div>
            <p className="text-sm font-semibold text-brand-navy">Certificate earned</p>
            <p className="mt-0.5 text-sm text-muted">
              New lessons have been added since — you&apos;re {progress}% through
              the current course.
            </p>
          </div>
        </div>
        <Link
          href="/student/certificates"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-teal/30 bg-white px-4 text-sm font-semibold text-brand-navy transition hover:bg-surface sm:shrink-0"
        >
          <Award className="size-4" />
          View certificate
        </Link>
      </div>
    );
  }

  if (hasCertificate) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal/20 bg-[#e8faf6] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <Star className="mt-0.5 size-5 shrink-0 fill-[#f5b942] text-[#f5b942]" />
          <div>
            <p className="text-sm font-semibold text-brand-navy">
              {variant === "course"
                ? "You finished this course — share your experience below."
                : "Course complete!"}
            </p>
            {variant === "lesson" ? (
              <p className="mt-0.5 text-sm text-muted">
                Your certificate is ready. Tell others what you thought of{" "}
                {courseTitle}.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Link
            href="/student/certificates"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Award className="size-4" />
            View certificate
          </Link>
          {variant === "lesson" ? (
            <Link
              href={`/student/courses/${courseSlug}#course-reviews`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-teal/30 bg-white px-4 text-sm font-semibold text-brand-navy transition hover:bg-surface"
            >
              Write a review
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (remainingQuizzes.length === 0) return null;
  // Mid-course, the quiz tabs already flag this; only nag once lessons are done.
  if (variant === "lesson" && progress < 100) return null;

  const count = remainingQuizzes.length;
  const quizzesLabel = `${count} quiz${count === 1 ? "" : "zes"}`;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <Award className="mt-0.5 size-5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-brand-navy">
            Pass all quizzes to earn your certificate
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {progress >= 100
              ? `Every lesson is done — ${quizzesLabel} left to pass.`
              : `Complete every lesson and pass ${quizzesLabel}.`}
          </p>
          <ul className="mt-3 space-y-1.5">
            {remainingQuizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/student/courses/${courseSlug}/lessons/${quiz.lessonId}`}
                  className="group flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm transition hover:bg-surface"
                >
                  <HelpCircle className="size-4 shrink-0 text-brand-purple" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#324361]">
                      {quiz.title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      in {quiz.lessonTitle}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted transition group-hover:text-brand-purple" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
