export default function InstructorLoading() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-white" />
        <div className="h-4 w-72 animate-pulse rounded bg-white" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="animate-pulse overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <div className="aspect-[16/9] w-full bg-surface" />
            <div className="space-y-3 p-4 sm:p-5">
              <div className="h-3 w-24 rounded bg-surface" />
              <div className="h-4 w-40 rounded bg-surface" />
              <div className="h-2 w-full rounded-full bg-surface/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
