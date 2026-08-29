import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const enrollmentDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatEnrollmentDate(date: Date) {
  return enrollmentDateFormatter.format(date);
}

function normalizeProgress(progress: number) {
  return Math.round(Math.max(0, Math.min(100, progress)));
}

type Props = { params: Promise<{ courseId: string }> };

export default async function InstructorCourseStudentsPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: {
      instructorId: session.user.id,
      OR: [{ id: courseId }, { slug: courseId }],
    },
    select: {
      title: true,
      slug: true,
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        select: {
          id: true,
          enrolledAt: true,
          progress: true,
          student: { select: { name: true, email: true, image: true } },
        },
      },
    },
  });

  if (!course) notFound();

  const averageProgress =
    course.enrollments.length === 0
      ? 0
      : normalizeProgress(
          course.enrollments.reduce(
            (total, enrollment) => total + enrollment.progress,
            0,
          ) / course.enrollments.length,
        );

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        backHref={`/instructor/courses/${course.slug}`}
        backLabel="Back to course"
        title="Students"
        subtitle={`Learners enrolled in ${course.title}.`}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
        <span className="flex items-center gap-2">
          <Users className="size-4 text-brand-purple" />
          <strong className="text-brand-navy">
            {course.enrollments.length}
          </strong>{" "}
          {course.enrollments.length === 1 ? "student" : "students"}
        </span>
        {course.enrollments.length > 0 ? (
          <span>
            <strong className="text-brand-navy">{averageProgress}%</strong>{" "}
            average progress
          </span>
        ) : null}
      </div>

      {course.enrollments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-purple/10 text-brand-purple">
            <Users className="size-5" />
          </div>
          <p className="mt-4 font-semibold text-brand-navy">
            No students enrolled yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Enrollments for this course will appear here with each learner&apos;s
            progress.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {course.enrollments.map((enrollment) => {
              const progress = normalizeProgress(enrollment.progress);

              return (
                <article
                  key={enrollment.id}
                  className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={enrollment.student.name}
                      image={enrollment.student.image}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#324361]">
                        {enrollment.student.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {enrollment.student.email}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Enrolled {formatEnrollmentDate(enrollment.enrolledAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <ProgressBar value={progress} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs font-medium text-muted">
                      {progress}%
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface/80 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Student</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Enrolled</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Progress</th>
                </tr>
              </thead>
              <tbody>
                {course.enrollments.map((enrollment) => {
                  const progress = normalizeProgress(enrollment.progress);

                  return (
                    <tr
                      key={enrollment.id}
                      className="border-t border-black/5 transition hover:bg-surface/50"
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={enrollment.student.name}
                            image={enrollment.student.image}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-[#324361]">
                              {enrollment.student.name}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {enrollment.student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-muted sm:px-5">
                        {formatEnrollmentDate(enrollment.enrolledAt)}
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex min-w-[190px] items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <ProgressBar value={progress} />
                          </div>
                          <span className="w-10 text-right text-xs font-medium text-muted">
                            {progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
