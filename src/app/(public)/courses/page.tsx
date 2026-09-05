import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, Users } from "lucide-react";
import { CoursesCatalog } from "@/components/course/courses-catalog";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export default async function CoursesPage() {
  const ctx = await resolveTenantFromHeaders();
  if (!ctx) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="font-display text-2xl text-brand-navy">
          Catalog unavailable
        </h1>
        <p className="mt-3 text-muted">
          Run <code className="rounded bg-surface px-1.5 py-0.5 text-sm">pnpm db:seed</code>{" "}
          to create the default institute, then refresh.
        </p>
      </div>
    );
  }

  const orgFilter = { organizationId: ctx.organizationId };

  const [total, featured] = await Promise.all([
    prisma.course.count({ where: { status: "PUBLISHED", ...orgFilter } }),
    prisma.course.findMany({
      where: { status: "PUBLISHED", featured: true, ...orgFilter },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        thumbnail: true,
      },
    }),
  ]);

  return (
    <div className="bg-[#f7f8fc] pb-16 sm:pb-20">
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="pointer-events-none absolute -right-16 top-0 size-[260px] rounded-full bg-[radial-gradient(circle,rgba(75,229,202,0.2),transparent_60%)] sm:size-[380px]" />

        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-12 md:px-10 md:py-14 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start lg:gap-12 lg:px-16 lg:py-16">
          <div className="min-w-0">
            <p className="inline-flex max-w-full items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-sm sm:tracking-[0.2em]">
              <BookOpen className="size-3.5 shrink-0 text-brand-mint sm:size-4" />
              <span className="truncate">Course catalog</span>
            </p>
            <h1 className="mt-3 font-display text-[1.85rem] leading-[1.15] sm:mt-4 sm:text-4xl md:text-5xl lg:text-[56px] lg:leading-tight">
              Courses from the{" "}
              <span className="text-brand-mint">live catalog</span>
            </h1>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-white/80 sm:mt-4 sm:text-lg">
              Filter by topic, level, and price. Every listing is loaded from
              PostgreSQL — enrollments, modules, and reviews included.
            </p>
            <div className="mt-6 flex flex-col gap-3 text-sm text-white/90 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-6">
              <div className="flex items-center gap-2">
                <Users className="size-4 shrink-0 text-brand-mint" />
                <span>
                  <strong className="text-white">{total}</strong> live listings
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-brand-mint" />
                <span>
                  <strong className="text-white">{featured.length}</strong> editor
                  picks
                </span>
              </div>
            </div>
          </div>

          <div className="min-w-0 lg:w-full">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-mint lg:hidden">
              Editor picks
            </p>
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-0 sm:px-0 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-1 lg:gap-3 lg:overflow-visible lg:pb-0">
              {featured.map((course, i) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group flex w-[min(85vw,300px)] shrink-0 snap-start items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md transition hover:bg-white/15 sm:w-[min(70vw,280px)] lg:w-auto lg:shrink"
                >
                  <img
                    src={resolveMediaUrl(course.thumbnail)}
                    alt=""
                    className="size-14 shrink-0 rounded-xl object-cover sm:size-16"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-mint">
                      Pick 0{i + 1}
                    </p>
                    <p className="line-clamp-2 text-sm font-semibold text-white">
                      {course.title}
                    </p>
                    <p className="mt-0.5 text-xs text-white/70">
                      ${(course.price / 100).toFixed(2)}
                    </p>
                  </div>
                  <ArrowRight className="hidden size-4 shrink-0 text-white/50 opacity-0 transition group-hover:opacity-100 sm:block" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="mx-auto max-w-[1440px] px-4 py-12 text-sm text-muted sm:px-6 md:px-10 lg:px-16">
            Loading catalog…
          </div>
        }
      >
        <CoursesCatalog />
      </Suspense>
    </div>
  );
}
