export default function StudentLoading() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex animate-pulse flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:p-5">
        <div className="aspect-video w-full rounded-xl bg-surface sm:aspect-auto sm:h-28 sm:w-44 sm:shrink-0" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-3 w-32 rounded bg-surface" />
          <div className="h-2 w-full rounded-full bg-surface/70" />
          <div className="h-3 w-48 rounded bg-surface" />
        </div>
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="h-4 w-40 rounded bg-surface" />
        <div className="mt-2 h-3 w-56 rounded bg-surface" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-9 rounded-xl bg-surface/70" />
          ))}
        </div>
      </div>
    </div>
  );
}
