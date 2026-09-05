import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseCard } from "@/components/course/course-card";
import { Button } from "@/components/ui/button";
import { getFeaturedCoursesForHome } from "@/lib/dashboard-data";
import { staticAssets } from "@/lib/static-assets";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export default async function HomePage() {
  const ctx = await resolveTenantFromHeaders();
  const brandName = ctx?.organization.name ?? "Edujarr";
  const featuredCourses = ctx
    ? await getFeaturedCoursesForHome(ctx.organizationId)
    : [];

  return (
    <div className="overflow-x-hidden bg-[#fafbfc]">
      <section className="relative isolate overflow-hidden bg-brand-navy text-white">
        <div className="absolute inset-0 bg-hero-gradient opacity-95" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative mx-auto grid min-h-[480px] max-w-[1440px] lg:min-h-[620px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="z-20 flex min-w-0 flex-col justify-center space-y-5 px-4 py-10 sm:space-y-6 sm:px-5 sm:py-12 md:px-10 lg:px-16 lg:py-16">
            <p className="text-[13px] font-medium tracking-wide text-brand-mint md:text-sm">
              {brandName}
            </p>
            <h1 className="max-w-[14ch] font-display text-[34px] leading-[1.06] tracking-tight sm:text-[40px] md:text-[58px] lg:text-[68px]">
              Learn. Practice.
              <span className="block text-brand-mint">Get certified.</span>
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
              Courses, roadmaps, and lesson videos — enroll with free access or
              pay by screenshot for paid courses.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button href="/courses" className="min-w-[148px]">
                Browse courses
              </Button>
              <Link
                href="/roadmaps"
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/30 px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                Roadmaps
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-[420px] lg:block">
            <div className="absolute bottom-0 right-0 z-10 h-[88%] w-auto">
              <img
                src={staticAssets.heroWoman}
                alt=""
                className="h-full w-auto max-w-none object-contain object-bottom"
              />
            </div>
            <div className="absolute bottom-8 left-4 z-20 max-w-[260px] rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-mint">
                On {brandName}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                Follow structured courses and roadmaps, then earn a certificate when
                you finish.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-brand-navy md:text-3xl">
                Featured courses
              </h2>
              <p className="mt-1 text-sm text-muted">
                From the live catalog.
              </p>
            </div>
            <Link
              href="/courses"
              className="text-sm font-semibold text-brand-purple hover:text-brand-teal"
            >
              View all
            </Link>
          </div>

          {featuredCourses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} {...course} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-sm text-muted">
              {ctx
                ? "No featured courses yet."
                : "Database is not connected. Point DATABASE_URL at local Docker (:5435) or a Supabase pooler URI, then run pnpm db:seed."}{" "}
              {ctx ? (
                <Link href="/courses" className="font-semibold text-brand-purple">
                  Browse the catalog
                </Link>
              ) : null}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
