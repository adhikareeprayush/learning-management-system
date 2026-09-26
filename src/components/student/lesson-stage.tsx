"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, FileText, RotateCcw } from "lucide-react";
import { VideoPlayer } from "@/components/course/video-player";
import {
  LessonCompleteToggle,
  saveLessonCompletion,
} from "@/components/course/lesson-complete-toggle";

type LessonStageProps = {
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  duration: string;
  summary: string;
  initialCompleted: boolean;
  next: { href: string; title: string } | null;
  courseHref: string;
};

/**
 * Video, completion toggle and the end-of-video prompt share one completion
 * state: finishing the video marks the lesson complete through the same API
 * as the manual toggle. Key it by lesson id so state never leaks between lessons.
 */
export function LessonStage({
  lessonId,
  lessonTitle,
  videoUrl,
  duration,
  summary,
  initialCompleted,
  next,
  courseHref,
}: LessonStageProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [ended, setEnded] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);

  async function handleEnded() {
    setEnded(true);
    if (completed) return;
    setAutoError(null);
    try {
      await saveLessonCompletion(lessonId, true);
      setCompleted(true);
      router.refresh();
    } catch (err) {
      setAutoError(
        err instanceof Error
          ? `${err.message} — use “Mark complete” below.`
          : "Could not mark this lesson complete.",
      );
    }
  }

  return (
    <>
      {videoUrl ? (
        <div className="relative">
          <VideoPlayer url={videoUrl} title={lessonTitle} onEnded={handleEnded} />
          {ended ? (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-brand-navy/90 p-5 text-center text-white"
            >
              <div>
                <CheckCircle2 className="mx-auto size-8 text-brand-mint" />
                <p className="mt-2 text-base font-semibold sm:text-lg">
                  {completed ? "Lesson complete" : "Video finished"}
                </p>
                {next ? (
                  <p className="mt-1 text-sm text-white/75">
                    Up next: <span className="font-semibold text-white">{next.title}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-white/75">
                    That was the last lesson in this course.
                  </p>
                )}
                {autoError ? (
                  <p className="mt-2 text-xs text-red-200">{autoError}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  href={next?.href ?? courseHref}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-mint px-4 text-sm font-semibold text-[#0b0a2e] transition hover:bg-brand-mint/90"
                >
                  {next ? "Next lesson" : "Back to course"}
                  <ArrowRight className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setEnded(false)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <RotateCcw className="size-4" />
                  Watch again
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <LessonCompleteToggle
            lessonId={lessonId}
            lessonTitle={lessonTitle}
            completed={completed}
            onCompletedChange={setCompleted}
          />
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Clock3 className="size-3.5" />
            {duration}
          </span>
          {videoUrl ? null : (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <FileText className="size-3.5" />
              Reading lesson — no video
            </span>
          )}
        </div>
        {summary ? (
          <p className="mt-2 text-sm text-muted sm:text-base">{summary}</p>
        ) : null}
      </div>
    </>
  );
}
