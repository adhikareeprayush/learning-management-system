"use client";

import { CheckCircle2, X } from "lucide-react";

type FlashBannerProps = {
  message: string | null;
  onDismiss: () => void;
};

export function FlashBanner({ message, onDismiss }: FlashBannerProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-brand-teal/25 bg-[#e8faf6] px-3 py-2.5 text-sm text-brand-navy"
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="grid size-6 shrink-0 place-items-center rounded-md text-muted transition hover:bg-white hover:text-brand-navy"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
