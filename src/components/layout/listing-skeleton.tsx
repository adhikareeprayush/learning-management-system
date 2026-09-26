/**
 * Loading state for the public listing pages (hero band + card grid). Used
 * only by list pages: a loading boundary above a page that calls notFound()
 * would stream a 200 before the 404 is known.
 */
export function ListingSkeleton() {
  return (
    <div className="bg-[#f7f8fc] pb-16" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="bg-brand-navy">
        <div className="mx-auto max-w-[1440px] animate-pulse px-4 py-12 sm:px-6 md:px-10 md:py-16 lg:px-16">
          <div className="h-3 w-32 rounded bg-white/15" />
          <div className="mt-5 h-9 w-full max-w-md rounded-lg bg-white/15" />
          <div className="mt-4 h-4 w-full max-w-sm rounded bg-white/10" />
        </div>
      </div>
      <div className="mx-auto grid max-w-[1440px] animate-pulse gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 md:px-10 lg:grid-cols-3 lg:px-16">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-black/5 bg-white"
          >
            <div className="aspect-[16/10] bg-surface" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-3/4 rounded bg-surface" />
              <div className="h-3 w-1/2 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
