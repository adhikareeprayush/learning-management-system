import Link from "next/link";
import { redirect } from "next/navigation";
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

export default async function InstructorStudentsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const enrollments = await prisma.enrollment.findMany({
    where: { course: { instructorId: session.user.id } },
    orderBy: { enrolledAt: "desc" },
    select: {
      id: true,
      enrolledAt: true,
      progress: true,
      student: { select: { id: true, name: true, email: true, image: true } },
      course: { select: { title: true, slug: true } },
    },
  });

  const studentCount = new Set(
    enrollments.map((enrollment) => enrollment.student.id),
  ).size;
  const courseCount = new Set(
    enrollments.map((enrollment) => enrollment.course.slug),
  ).size;

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Students"
        subtitle="Learners enrolled across your courses."
      />

      <div className="flex items-center gap-2 text-sm text-muted">
        <Users className="size-4 text-brand-purple" />
        <span>
          <strong className="text-brand-navy">{studentCount}</strong>{" "}
          {studentCount === 1 ? "student" : "students"} across{" "}
          <strong className="text-brand-navy">{courseCount}</strong>{" "}
          {courseCount === 1 ? "course" : "courses"}
        </span>
      </div>

      {enrollments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-purple/10 text-brand-purple">
            <Users className="size-5" />
          </div>
          <p className="mt-4 font-semibold text-brand-navy">
            No students enrolled yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Students will appear here as soon as they enroll in one of your
            courses.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {enrollments.map((enrollment) => {
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
                      <Link
                        href={`/instructor/courses/${enrollment.course.slug}/students`}
                        className="mt-2 inline-block text-sm font-medium text-brand-purple transition hover:text-brand-navy"
                      >
                        {enrollment.course.title}
                      </Link>
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
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface/80 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Student</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Course</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Enrolled</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Progress</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => {
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
                      <td className="px-4 py-4 sm:px-5">
                        <Link
                          href={`/instructor/courses/${enrollment.course.slug}/students`}
                          className="font-medium text-brand-purple transition hover:text-brand-navy"
                        >
                          {enrollment.course.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-muted sm:px-5">
                        {formatEnrollmentDate(enrollment.enrolledAt)}
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex min-w-[170px] items-center gap-3">
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
