import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Award,
  CheckCircle2,
  Circle,
  Download,
  Play,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { getServerSession } from "@/lib/auth";
import { formatLevel, getRoadmapDetail } from "@/lib/roadmaps";

type Props = { params: Promise<{ roadmapId: string }> };

export default async function StudentRoadmapDetailPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { roadmapId } = await params;
  const roadmap = await getRoadmapDetail(roadmapId, session.user.id);
  if (!roadmap) notFound();

  if (!roadmap.enrolled) {
    redirect(`/roadmaps/${roadmap.slug}`);
  }

  const nextCourse =
    roadmap.courses.find((c) => !c.completed) ?? roadmap.courses[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        backHref="/student/roadmaps"
        backLabel="My roadmaps"
        title={roadmap.title}
        subtitle={`${formatLevel(roadmap.level)}${
          roadmap.category ? ` · ${roadmap.category}` : ""
        } · ${roadmap.completedCount}/${roadmap.courseCount} courses complete`}
        status={
          roadmap.hasCertificate ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <Award className="size-3.5" />
              Path complete
            </span>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:p-5">
        <img
          src={roadmap.thumbnail}
          alt=""
          className="aspect-video w-full rounded-xl object-cover sm:aspect-auto sm:h-28 sm:w-44 sm:shrink-0"
        />
        <div className="min-w-0 flex-1">
          <ProgressBar value={roadmap.progress} label="Roadmap progress" />
          <p className="mt-2 text-sm text-muted">
            Complete every course to unlock the roadmap certificate.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
          {nextCourse && !roadmap.hasCertificate ? (
            <Link
              href={`/student/courses/${nextCourse.slug}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#083f9b] px-5 text-sm font-semibold text-white transition hover:bg-brand-purple"
            >
              <Play className="size-4 fill-current" />
              {roadmap.progress > 0 ? "Continue" : "Start"}
            </Link>
          ) : null}
          {roadmap.hasCertificate && roadmap.certificateId ? (
            <a
              href={`/api/student/certificates/roadmap/${roadmap.certificateId}/pdf`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-teal px-5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Download className="size-4" />
              Path certificate
            </a>
          ) : null}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="border-b border-black/5 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-brand-navy">
            Path curriculum
          </h2>
        </div>
        <ol className="divide-y divide-black/5">
          {roadmap.courses.map((course, index) => (
            <li key={course.id}>
              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-brand-navy">
                    {index + 1}
                  </span>
                  {course.completed ? (
                    <CheckCircle2 className="size-5 shrink-0 text-brand-teal" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#324361]">
                      {course.title}
                    </p>
                    <p className="text-xs text-muted">
                      {course.instructorName}
                      {course.hasCertificate ? " · Course certificate earned" : ""}
                    </p>
                    {course.enrolled ? (
                      <div className="mt-2 max-w-xs">
                        <ProgressBar value={course.progress} />
                      </div>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={`/student/courses/${course.slug}`}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-black/8 px-3 text-sm font-semibold text-brand-navy transition hover:bg-surface"
                >
                  {course.completed
                    ? "Review"
                    : course.enrolled
                      ? "Continue"
                      : "Open"}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
