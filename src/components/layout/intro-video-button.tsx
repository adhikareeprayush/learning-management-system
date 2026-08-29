"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";

type IntroVideoButtonProps = {
  className?: string;
  label?: string;
  variant?: "orb" | "button";
};

export function IntroVideoButton({
  className = "",
  label = "Play intro video",
  variant = "orb",
}: IntroVideoButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {variant === "orb" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex size-20 items-center justify-center rounded-full bg-brand-purple/85 shadow-xl backdrop-blur-sm transition hover:scale-105 md:size-28 ${className}`}
          aria-label={label}
        >
          <Play className="size-8 fill-white text-white md:size-10" />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={className}>
          {label}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Intro video"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-brand-navy shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
              aria-label="Close video"
            >
              <X className="size-4" />
            </button>
            <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-hero-gradient px-6 text-center text-white">
              <Play className="size-12 opacity-90" />
              <p className="font-display text-2xl">Edujarr intro</p>
              <p className="max-w-md text-sm text-white/80">
                Platform walkthrough — swap in a course trailer or Loom embed when
                you have one.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
