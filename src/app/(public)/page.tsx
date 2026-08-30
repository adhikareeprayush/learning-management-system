import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Compass,
  GraduationCap,
} from "lucide-react";
import { CourseCard } from "@/components/course/course-card";
import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/layout/hero-search";
import { categoryIcons } from "@/lib/nav";
import { getFeaturedCoursesForHome } from "@/lib/dashboard-data";
import {
  assets,
  categories,
  featuredCourses as mockFeaturedCourses,
  homeStats,
  testimonials,
} from "@/lib/mock-home";

export default async function HomePage() {
  const dbFeatured = await getFeaturedCoursesForHome();
  const featuredCourses =
    dbFeatured.length > 0 ? dbFeatured : [...mockFeaturedCourses];

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
              Courses · roadmaps · certificates
            </p>
            <h1 className="max-w-[14ch] font-display text-[34px] leading-[1.06] tracking-tight sm:text-[40px] md:text-[58px] lg:text-[68px]">
              Learn in order.
              <span className="block text-brand-mint">Ship something real.</span>
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
              Edujarr is a learning platform demo — real enrollments, lesson
              progress, manual payment enrollment, and path certificates. Built as
              a portfolio piece, not a course marketplace clone.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button href="/courses" className="min-w-[148px]">
                Browse courses
              </Button>
              <Link
                href="/roadmaps"
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/30 px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                See roadmaps
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <HeroSearch />
          </div>

          <div className="relative hidden min-h-[420px] lg:block">
            <div className="absolute bottom-0 right-0 z-10 h-[88%] w-auto">
              <img
                src={assets.heroWoman}
                alt=""
                className="h-full w-auto max-w-none object-contain object-bottom"
              />
            </div>
            <div className="absolute bottom-8 left-4 z-20 max-w-[260px] rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-mint">
                This week on Edujarr
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                Bob completed{" "}
                <strong className="text-white">Intro to Web Development</strong>{" "}
                and earned the Web Developer Starter path certificate.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-black/5 bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4 md:px-10 lg:px-16">
          {homeStats.map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="font-display text-3xl text-brand-navy md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-16">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-3xl tracking-tight text-brand-navy md:text-4xl">
                Featured courses
              </h2>
              <p className="mt-2 max-w-xl text-muted">
                Pulled from the live catalog — modules, quizzes, assignments, and
                reviews included.
              </p>
            </div>
            <Link
              href="/courses"
              className="text-sm font-semibold text-brand-purple hover:text-brand-teal"
            >
              View all courses →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {featuredCourses.slice(0, 6).map((course) => (
              <CourseCard key={course.id} {...course} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/5 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal">
                Learning paths
              </p>
              <h2 className="mt-2 font-display text-3xl text-brand-navy md:text-4xl">
                Five roadmaps. Clear order. One credential at the end.
              </h2>
              <p className="mt-4 text-muted leading-relaxed">
                Each path chains real courses — Web Developer Starter, Digital
                Growth, Creator Career, Full-Stack UI, and Design to Ship.
                Finish every course in a path to earn a roadmap certificate.
              </p>
              <Button href="/roadmaps" className="mt-6">
                Explore roadmaps
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Compass, title: "Ordered courses", text: "No guessing what to take next." },
                { icon: Award, title: "Path certificates", text: "Separate from per-course credentials." },
                { icon: BookOpen, title: "Per-course progress", text: "Pick up anywhere; roadmaps sync it." },
                { icon: GraduationCap, title: "Demo enrollments", text: "Try as alice, bob, or carol." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-black/5 bg-surface/60 p-4"
                  >
                    <Icon className="size-5 text-brand-purple" strokeWidth={1.75} />
                    <h3 className="mt-2 font-semibold text-[#324361]">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-16">
          <div className="mb-10">
            <h2 className="font-display text-3xl text-brand-navy md:text-4xl">
              Browse by topic
            </h2>
            <p className="mt-2 text-muted">
              Honest counts from what&apos;s published today — not a fake
              marketplace inventory.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const Icon = categoryIcons[cat.name] ?? BookOpen;
              const slug = cat.name
                .toLowerCase()
                .replace(/&/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-");
              const href =
                cat.name === "Career paths"
                  ? "/roadmaps"
                  : cat.name === "Certificates"
                    ? "/student/certificates"
                    : `/courses?category=${slug}`;
              return (
                <Link
                  key={cat.name}
                  href={href}
                  className={`group flex items-center gap-4 rounded-2xl border border-black/5 ${cat.tint} p-5 transition hover:border-brand-purple/20 hover:shadow-md`}
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-purple shadow-sm">
                    <Icon className="size-6" strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="block font-semibold text-[#324361]">
                      {cat.name}
                    </span>
                    <span className="text-sm text-muted">{cat.count}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-brand-navy py-16 text-white md:py-20">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 md:px-10 lg:grid-cols-2 lg:px-16">
          <div className="relative min-h-[280px] overflow-hidden rounded-3xl">
            <img
              src={assets.aboutCollage}
              alt=""
              className="size-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-display text-3xl leading-tight md:text-4xl">
              Built to show how an LMS should feel
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/80">
              Student dashboards, instructor workspaces, admin newsletter tools,
              ImageKit media, and screenshot-based payments — wired end to end so
              you can click through a real flow, not a Figma mock.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/about" variant="white">
                About the project
              </Button>
              <Button href="/login" variant="outline">
                Try demo login
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-16">
          <div className="mb-10">
            <h2 className="font-display text-3xl text-brand-navy md:text-4xl">
              From students in the demo
            </h2>
            <p className="mt-2 text-muted">
              Reviews tied to real completed courses in the seed data.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <article
                key={t.name}
                className="flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-3">
                  <img
                    src={t.image}
                    alt=""
                    className="size-11 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-[#324361]">{t.name}</h3>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </div>
                <p className="flex-1 text-[15px] leading-relaxed text-[#4e596b]">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
