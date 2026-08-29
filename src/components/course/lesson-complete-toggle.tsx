"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { FlashBanner } from "@/components/ui/flash-banner";

type LessonCompleteToggleProps = {
  lessonId: string;
  initialCompleted: boolean;
  lessonTitle: string;
};

export function LessonCompleteToggle({
  lessonId,
  initialCompleted,
  lessonTitle,
}: LessonCompleteToggleProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !completed;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not update progress");
      }
      setCompleted(next);
      setFlash(
        next
          ? `Marked “${lessonTitle}” complete.`
          : `Marked “${lessonTitle}” as in progress.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {completed ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            Completed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-brand-purple">
            <Circle className="size-3.5" />
            In progress
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          className="rounded-lg border border-black/8 px-2.5 py-1 text-xs font-semibold text-brand-navy transition hover:bg-surface disabled:opacity-50"
        >
          {loading
            ? "Saving…"
            : completed
              ? "Mark incomplete"
              : "Mark complete"}
        </button>
      </div>
    </div>
  );
}
