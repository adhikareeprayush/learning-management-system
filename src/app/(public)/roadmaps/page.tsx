import Link from "next/link";
import {
  Award,
  BookOpen,
  Clock,
  Map,
  Route,
  Sparkles,
  Users,
} from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { formatLevel, listPublishedRoadmaps } from "@/lib/roadmaps";

export default async function RoadmapsPage() {
  const session = await getServerSession();
  const roadmaps = await listPublishedRoadmaps(session?.user.id ?? null);

  return (
    <div className="bg-[#f7f8fc] pb-16 sm:pb-20">
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="pointer-events-none absolute -right-16 top-0 size-[260px] rounded-full bg-[radial-gradient(circle,rgba(75,229,202,0.2),transparent_60%)] sm:size-[380px]" />

        <div className="relative mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-12 md:px-10 md:py-14 lg:px-16 lg:py-16">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-sm sm:tracking-[0.2em]">
            <Route className="size-3.5 text-brand-mint sm:size-4" />
            Learning paths
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-[1.85rem] leading-[1.15] sm:mt-4 sm:text-4xl md:text-5xl lg:text-[56px] lg:leading-tight">
            Five paths.{" "}
            <span className="text-brand-mint">Real course order.</span>
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80 sm:mt-4 sm:text-lg">
            Each roadmap chains published courses with modules and lessons already
            in the catalog. Finish the path, earn a credential separate from
            individual course certificates.
          </p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm text-white/90">
            <span className="inline-flex items-center gap-2">
              <Map className="size-4 text-brand-mint" />
              <strong className="text-white">{roadmaps.length}</strong> paths
            </span>
            <span className="inline-flex items-center gap-2">
              <Award className="size-4 text-brand-mint" />
              Path + course certificates
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 md:px-10 lg:px-16">
        {roadmaps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
            <p className="font-semibold text-brand-navy">No roadmaps yet</p>
            <p className="mt-1 text-sm text-muted">
              Check back soon for curated learning paths.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {roadmaps.map((roadmap) => (
              <Link
                key={roadmap.id}
                href={`/roadmaps/${roadmap.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-brand-purple/25 hover:shadow-md"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-surface">
                  <img
                    src={roadmap.thumbnail}
                    alt=""
                    className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  {roadmap.featured ? (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-brand-navy/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-mint">
                      <Sparkles className="size-3" />
                      Featured
                    </span>
                  ) : null}
                  {roadmap.hasCertificate ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-emerald-600/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      <Award className="size-3" />
                      Earned
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                    {roadmap.category ? (
                      <span className="rounded-md bg-brand-teal/10 px-2 py-0.5 text-brand-teal">
                        {roadmap.category}
                      </span>
                    ) : null}
                    <span className="rounded-md bg-surface px-2 py-0.5 text-brand-navy">
                      {formatLevel(roadmap.level)}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-xl text-brand-navy">
                    {roadmap.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">
                    {roadmap.description || "A curated path of courses."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="size-3.5 text-brand-purple" />
                      {roadmap.courseCount} courses
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5 text-brand-teal" />
                      ~{roadmap.estimatedHours}h
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5 text-brand-navy" />
                      {roadmap.learnerCount}
                    </span>
                  </div>
                  {roadmap.enrolled ? (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-muted">
                        <span>Your progress</span>
                        <span className="font-semibold text-brand-navy">
                          {Math.round(roadmap.progress)}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-brand-teal"
                          style={{
                            width: `${Math.min(100, Math.max(0, roadmap.progress))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
