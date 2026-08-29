"use client";

type LiveIndicatorProps = {
  refreshedAt: Date;
  refreshing?: boolean;
};

function formatRelative(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LiveIndicator({ refreshedAt, refreshing }: LiveIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8faf6] px-2.5 py-1 text-xs font-semibold text-brand-teal">
      <span className="relative flex size-2">
        {!refreshing ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-teal opacity-60" />
        ) : null}
        <span
          className={`relative inline-flex size-2 rounded-full bg-brand-teal ${
            refreshing ? "animate-pulse" : ""
          }`}
        />
      </span>
      Live · {refreshing ? "updating…" : formatRelative(refreshedAt)}
    </span>
  );
}
