export default function AdminLoading() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-[108px] animate-pulse rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5"
          >
            <div className="h-3 w-24 rounded bg-surface" />
            <div className="mt-4 h-7 w-16 rounded bg-surface" />
          </div>
        ))}
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
