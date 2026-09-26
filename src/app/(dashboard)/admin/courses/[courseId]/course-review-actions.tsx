"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, CircleCheck, Loader2, Star, Undo2, type LucideIcon } from "lucide-react";
import { FlashBanner } from "@/components/ui/flash-banner";

type CourseStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

const NOTE_MAX = 1000;

type Action = {
  next: CourseStatus;
  label: string;
  icon: LucideIcon;
  tone: "primary" | "neutral" | "danger";
  confirm?: string;
  /** Moving someone's course back to draft needs a note telling them what to change. */
  needsNote?: boolean;
};

const actionsByStatus: Record<CourseStatus, Action[]> = {
  IN_REVIEW: [
    { next: "PUBLISHED", label: "Approve & publish", icon: CircleCheck, tone: "primary" },
    {
      next: "DRAFT",
      label: "Return to draft",
      icon: Undo2,
      tone: "neutral",
      confirm: "Return this course to the instructor as a draft.",
      needsNote: true,
    },
  ],
  DRAFT: [
    { next: "PUBLISHED", label: "Publish", icon: CircleCheck, tone: "primary" },
    {
      next: "ARCHIVED",
      label: "Archive",
      icon: Archive,
      tone: "danger",
      confirm: "Archive this draft? It stays hidden until restored.",
    },
  ],
  PUBLISHED: [
    {
      next: "DRAFT",
      label: "Unpublish to draft",
      icon: Undo2,
      tone: "neutral",
      confirm:
        "Unpublish this course? It disappears from the catalog; enrolled students keep their enrollment.",
      needsNote: true,
    },
    {
      next: "ARCHIVED",
      label: "Archive",
      icon: Archive,
      tone: "danger",
      confirm: "Archive this course? It disappears from the catalog.",
    },
  ],
  ARCHIVED: [{ next: "DRAFT", label: "Restore to draft", icon: Undo2, tone: "neutral" }],
};

const toneClasses: Record<Action["tone"], string> = {
  primary: "border-transparent bg-brand-gradient text-white shadow-sm shadow-brand-purple/20 hover:brightness-110",
  neutral: "border-black/8 bg-white text-brand-navy hover:bg-surface",
  danger: "border-black/8 bg-white text-red-700 hover:bg-red-50",
};

const statusLabels: Record<CourseStatus, string> = {
  DRAFT: "draft",
  IN_REVIEW: "in review",
  PUBLISHED: "published",
  ARCHIVED: "archived",
};

async function patchCourse(courseId: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/courses/${courseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Could not update the course");
}

export function CourseReviewActions({
  courseId,
  status,
  missing,
  featured,
}: {
  courseId: string;
  status: CourseStatus;
  /** Checklist items the course PATCH will reject publishing without. */
  missing: string[];
  featured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<CourseStatus | "featured" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [note, setNote] = useState("");

  async function run(key: CourseStatus | "featured", body: Record<string, unknown>, message: string) {
    setBusy(key);
    setError(null);
    setFlash(null);
    try {
      await patchCourse(courseId, body);
      setPending(null);
      setNote("");
      setFlash(message);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the course");
    } finally {
      setBusy(null);
    }
  }

  function start(action: Action) {
    setError(null);
    if (action.confirm || action.needsNote) {
      setPending(action);
      setNote("");
      return;
    }
    void run(action.next, { status: action.next }, `Course is now ${statusLabels[action.next]}.`);
  }

  function confirmPending() {
    if (!pending) return;
    const trimmed = note.trim();
    if (pending.needsNote && !trimmed) {
      setError("Add a note telling the instructor what to change.");
      return;
    }
    void run(
      pending.next,
      pending.needsNote ? { status: pending.next, reviewNote: trimmed } : { status: pending.next },
      pending.needsNote
        ? "Course returned to the instructor as a draft with your note."
        : `Course is now ${statusLabels[pending.next]}.`,
    );
  }

  const publishBlocked = missing.length > 0;
  const noteTooLong = note.trim().length > NOTE_MAX;

  return (
    <div className="space-y-3">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {pending ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{pending.confirm}</p>
          {pending.needsNote ? (
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium">
                Note for the instructor (required)
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                maxLength={NOTE_MAX + 200}
                placeholder="What needs to change before this can be published?"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#324361] outline-none focus:border-brand-purple/40"
              />
              <span className={`mt-1 block text-right text-xs ${noteTooLong ? "text-red-700" : "text-muted"}`}>
                {note.trim().length}/{NOTE_MAX}
              </span>
            </label>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setPending(null);
                setNote("");
                setError(null);
              }}
              className="rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy !== null || noteTooLong || (pending.needsNote && !note.trim())}
              onClick={confirmPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending.label}
              {busy === pending.next ? <Loader2 className="size-3.5 animate-spin" /> : null}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {actionsByStatus[status].map((action) => {
            const Icon = action.icon;
            const blocked = action.next === "PUBLISHED" && publishBlocked;
            return (
              <button
                key={action.next}
                type="button"
                disabled={busy !== null || blocked}
                onClick={() => start(action)}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[action.tone]}`}
              >
                <Icon className="size-4" />
                {busy === action.next ? "Saving…" : action.label}
              </button>
            );
          })}
        </div>
      )}
      {publishBlocked && actionsByStatus[status].some((action) => action.next === "PUBLISHED") ? (
        <p className="text-xs text-muted">
          Publishing needs: {missing.join(", ")}.
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#324361]">Featured</p>
          <p className="text-xs text-muted">
            {status === "PUBLISHED"
              ? "Featured courses lead the homepage."
              : "Shown on the homepage once published."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={featured}
          aria-label="Featured on the homepage"
          disabled={busy !== null}
          onClick={() =>
            void run(
              "featured",
              { featured: !featured },
              featured ? "Removed from featured courses." : "Course is now featured.",
            )
          }
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition disabled:opacity-60 ${
            featured
              ? "border-brand-purple/30 bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/15"
              : "border-black/8 bg-white text-brand-navy hover:bg-surface"
          }`}
        >
          {busy === "featured" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Star className={`size-4 ${featured ? "fill-current" : ""}`} />
          )}
          {featured ? "Featured" : "Feature"}
        </button>
      </div>
    </div>
  );
}
