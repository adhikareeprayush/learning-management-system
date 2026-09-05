import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseCard } from "@/components/course/course-card";
import { Button } from "@/components/ui/button";
import { getFeaturedCoursesForHome } from "@/lib/dashboard-data";
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
        <div className="relative mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20 md:px-10 lg:px-16 lg:py-24">
          <p className="text-sm font-medium tracking-wide text-brand-mint">
            {brandName}
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-[2.25rem] leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
            Learn. Practice.
            <span className="block text-brand-mint">Get certified.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
            Courses, roadmaps, and lesson videos — enroll with free access or
            pay by screenshot for paid courses.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
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
              No featured courses yet.{" "}
              <Link href="/courses" className="font-semibold text-brand-purple">
                Browse the catalog
              </Link>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
