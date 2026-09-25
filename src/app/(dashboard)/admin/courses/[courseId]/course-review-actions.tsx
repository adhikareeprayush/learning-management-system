"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, CircleCheck, Undo2, type LucideIcon } from "lucide-react";
import { FlashBanner } from "@/components/ui/flash-banner";

type CourseStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

type Action = {
  next: CourseStatus;
  label: string;
  icon: LucideIcon;
  tone: "primary" | "neutral" | "danger";
  confirm?: string;
};

const actionsByStatus: Record<CourseStatus, Action[]> = {
  IN_REVIEW: [
    { next: "PUBLISHED", label: "Approve & publish", icon: CircleCheck, tone: "primary" },
    {
      next: "DRAFT",
      label: "Return to draft",
      icon: Undo2,
      tone: "neutral",
      confirm: "Return this course to the instructor as a draft?",
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
      confirm: "Unpublish this course? It disappears from the catalog; enrolled students keep their enrollment.",
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

export function CourseReviewActions({
  courseId,
  status,
  missing,
}: {
  courseId: string;
  status: CourseStatus;
  /** Checklist items the course PATCH will reject publishing without. */
  missing: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<CourseStatus | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(action: Action) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    setBusy(action.next);
    setError(null);
    setFlash(null);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.next }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update the course");
      setFlash(`Course is now ${statusLabels[action.next]}.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the course");
    } finally {
      setBusy(null);
    }
  }

  const publishBlocked = missing.length > 0;

  return (
    <div className="space-y-3">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {actionsByStatus[status].map((action) => {
          const Icon = action.icon;
          const blocked = action.next === "PUBLISHED" && publishBlocked;
          return (
            <button
              key={action.next}
              type="button"
              disabled={busy !== null || blocked}
              onClick={() => void changeStatus(action)}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[action.tone]}`}
            >
              <Icon className="size-4" />
              {busy === action.next ? "Saving…" : action.label}
            </button>
          );
        })}
      </div>
      {publishBlocked && actionsByStatus[status].some((action) => action.next === "PUBLISHED") ? (
        <p className="text-xs text-muted">
          Publishing needs: {missing.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
