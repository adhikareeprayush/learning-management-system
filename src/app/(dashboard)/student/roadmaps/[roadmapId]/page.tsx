import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Award,
  CheckCircle2,
  Circle,
  Download,
  Play,
  ShoppingCart,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { getServerSession } from "@/lib/auth";
import { courseRequiresPayment, formatCoursePrice } from "@/lib/pricing";
import {
  formatLevel,
  getRoadmapDetail,
  type RoadmapCourseProgress,
} from "@/lib/roadmaps";
import { requireTenantContext } from "@/lib/tenant";

type Props = { params: Promise<{ roadmapId: string }> };

/** Enrolled courses open in the player; others go to the public page to enroll or buy. */
function courseAction(course: RoadmapCourseProgress) {
  if (course.enrolled) {
    return {
      href: `/student/courses/${course.slug}`,
      label: course.completed
        ? "Review"
        : course.progress > 0
          ? "Continue"
          : "Start",
      paid: false,
    };
  }
  const paid = courseRequiresPayment(course);
  return {
    href: `/courses/${course.slug}`,
    label: paid ? `Buy · ${formatCoursePrice(course)}` : "Enroll",
    paid,
  };
}

export default async function StudentRoadmapDetailPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { roadmapId } = await params;
  const ctx = await requireTenantContext();
  const roadmap = await getRoadmapDetail(
    ctx.organizationId,
    roadmapId,
    session.user.id,
  );
  if (!roadmap) notFound();

  if (!roadmap.enrolled) {
    redirect(`/roadmaps/${roadmap.slug}`);
  }

  const nextCourse =
    roadmap.courses.find((c) => !c.completed) ?? roadmap.courses[0];
  const nextAction = nextCourse ? courseAction(nextCourse) : null;
  const lockedCount = roadmap.courses.filter((c) => !c.enrolled).length;
  // A certificate stays valid when courses are added to the path later, so
  // "earned" and "every course finished" are separate states.
  const allComplete =
    roadmap.courseCount > 0 && roadmap.completedCount >= roadmap.courseCount;

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
          allComplete || roadmap.hasCertificate ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <Award className="size-3.5" />
              {allComplete ? "Path complete" : "Certificate earned"}
            </span>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:p-5">
        <Image
          src={roadmap.thumbnail}
          alt=""
          width={352}
          height={224}
          className="aspect-video w-full rounded-xl object-cover sm:aspect-auto sm:h-28 sm:w-44 sm:shrink-0"
        />
        <div className="min-w-0 flex-1">
          <ProgressBar value={roadmap.progress} label="Roadmap progress" />
          <p className="mt-2 text-sm text-muted">
            {allComplete
              ? "You've completed every course in this path."
              : roadmap.hasCertificate
                ? "You've earned the path certificate. New courses have been added since — finish them to complete the full path."
                : "Complete every course to unlock the roadmap certificate."}
            {!allComplete && lockedCount > 0
              ? ` ${lockedCount} course${lockedCount === 1 ? " still needs" : "s still need"} enrollment.`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
          {nextCourse && nextAction && !allComplete ? (
            <Link
              href={nextAction.href}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-semibold text-white transition hover:bg-brand-purple"
            >
              {nextAction.paid ? (
                <ShoppingCart className="size-4" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
              {nextCourse.enrolled
                ? roadmap.progress > 0
                  ? "Continue"
                  : "Start"
                : nextAction.paid
                  ? "Buy next course"
                  : "Enroll in next course"}
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
          {roadmap.courses.map((course, index) => {
            const action = courseAction(course);
            return (
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
                        {course.hasCertificate
                          ? " · Course certificate earned"
                          : course.enrolled
                            ? ""
                            : action.paid
                              ? " · Purchase required"
                              : " · Not enrolled yet"}
                      </p>
                      {course.enrolled ? (
                        <div className="mt-2 max-w-xs">
                          <ProgressBar value={course.progress} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={action.href}
                    className={
                      course.enrolled
                        ? "inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-black/8 px-3 text-sm font-semibold text-brand-navy transition hover:bg-surface"
                        : "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-blue px-3 text-sm font-semibold text-white transition hover:bg-brand-purple"
                    }
                  >
                    {action.paid ? <ShoppingCart className="size-3.5" /> : null}
                    {action.label}
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
