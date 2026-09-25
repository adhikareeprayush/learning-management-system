"use client";

import { useId, useState } from "react";
import { ChevronDown, Eye, PlayCircle } from "lucide-react";
import { VideoPlayer } from "@/components/course/video-player";

type LessonPreviewRowProps = {
  number: number;
  title: string;
  duration: string;
  videoUrl: string | null;
  summary: string | null;
  paragraphs: string[];
};

/** Curriculum row for an instructor-enabled free preview; the player mounts only when opened. */
export function LessonPreviewRow({
  number,
  title,
  duration,
  videoUrl,
  summary,
  paragraphs,
}: LessonPreviewRowProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const Icon = videoUrl ? PlayCircle : Eye;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-surface/60 sm:px-5"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3 font-medium text-[#324361]">
          <Icon className="size-4 shrink-0 text-brand-teal" />
          <span className="min-w-0">
            <span className="line-clamp-2">
              {number}. {title}
            </span>
            <span className="mt-1 inline-block rounded bg-brand-teal/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-teal">
              {videoUrl ? "Free preview · Watch" : "Free preview · Read"}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
          {duration}
          <ChevronDown
            className={`size-4 transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="space-y-3 border-t border-black/5 bg-surface/40 px-4 py-4 sm:px-5"
      >
        {open ? (
          <>
            {videoUrl ? <VideoPlayer url={videoUrl} title={title} /> : null}
            {summary ? (
              <p className="text-sm font-medium text-[#324361]">{summary}</p>
            ) : null}
            {paragraphs.map((paragraph, index) => (
              // Paragraphs are static split text; order is the identity.
              <p key={index} className="text-sm leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
