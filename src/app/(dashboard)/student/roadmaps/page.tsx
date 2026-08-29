import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Award, Map, Route } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { getServerSession } from "@/lib/auth";
import { formatLevel, listPublishedRoadmaps } from "@/lib/roadmaps";
import { prisma } from "@/lib/db";

export default async function StudentRoadmapsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const [all, enrollments] = await Promise.all([
    listPublishedRoadmaps(session.user.id),
    prisma.roadmapEnrollment.findMany({
      where: { studentId: session.user.id },
      select: { roadmapId: true },
    }),
  ]);

  const enrolledIds = new Set(enrollments.map((e) => e.roadmapId));
  const mine = all.filter((r) => enrolledIds.has(r.id));
  const browse = all.filter((r) => !enrolledIds.has(r.id));

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Roadmaps"
        subtitle="Guided learning paths — enroll, complete courses, earn the path certificate."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <Route className="size-4 text-brand-purple" />
          <strong className="text-brand-navy">{mine.length}</strong> active path
          {mine.length === 1 ? "" : "s"}
        </span>
        <Link
          href="/roadmaps"
          className="inline-flex items-center gap-1 font-semibold text-brand-purple transition hover:text-brand-teal"
        >
          Browse all roadmaps
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <Map className="mx-auto size-10 text-brand-purple/50" />
          <p className="mt-4 font-semibold text-brand-navy">
            No roadmaps yet
          </p>
          <p className="mt-1 text-sm text-muted">
            Start a path to enroll in its courses and track path progress.
          </p>
          <Link
            href="/roadmaps"
            className="mt-4 inline-flex rounded-xl bg-[#083f9b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-purple"
          >
            Explore roadmaps
          </Link>
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {mine.map((roadmap) => (
            <Link
              key={roadmap.id}
              href={`/student/roadmaps/${roadmap.slug}`}
              className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-brand-purple/25 sm:p-5"
            >
              <div className="flex gap-4">
                <img
                  src={roadmap.thumbnail}
                  alt=""
                  className="size-16 shrink-0 rounded-xl object-cover sm:size-20"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-[#324361]">
                      {roadmap.title}
                    </p>
                    {roadmap.hasCertificate ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Award className="size-3" />
                        Path cert
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatLevel(roadmap.level)} · {roadmap.courseCount} courses
                  </p>
                  <div className="mt-3 max-w-sm">
                    <ProgressBar value={roadmap.progress} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {browse.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-brand-navy">
            Discover more paths
          </h2>
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-white">
            {browse.map((roadmap) => (
              <li key={roadmap.id}>
                <Link
                  href={`/roadmaps/${roadmap.slug}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface sm:px-5"
                >
                  <img
                    src={roadmap.thumbnail}
                    alt=""
                    className="size-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#324361]">
                      {roadmap.title}
                    </p>
                    <p className="text-xs text-muted">
                      {roadmap.courseCount} courses · ~{roadmap.estimatedHours}h
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
