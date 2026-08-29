import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/layout/page-hero";
import { events } from "@/lib/mock-home";

export default function EventsPage() {
  return (
    <div className="bg-[#fafbfc] pb-20">
      <PageHero
        eyebrow="Community"
        title={
          <>
            Upcoming <span className="text-brand-mint">Events</span>
          </>
        }
        description="Sample community sessions listed on the demo site."
        icon={Calendar}
      />
      <div
        id="office-hours"
        className="mx-auto max-w-[900px] space-y-4 px-5 py-12 md:px-10 lg:px-16"
      >
        {events.map((event) => (
          <article
            key={event.id}
            className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-display text-xl text-[#324361]">
                {event.title}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {event.date} · {event.place}
              </p>
              <p className="mt-1 text-xs font-semibold text-brand-teal">
                {event.seats}
              </p>
            </div>
            <Button href="/contact" variant="secondary" className="shrink-0">
              Ask about this event
            </Button>
          </article>
        ))}
      </div>
      <div id="workshops" className="sr-only">
        Workshops
      </div>
    </div>
  );
}
