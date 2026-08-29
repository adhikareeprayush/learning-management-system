import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: string) {
  if (status === "PUBLISHED") return "Published";
  if (status === "IN_REVIEW") return "Review";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

export default async function InstructorCoursesPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const courses = await prisma.course.findMany({
    where: { instructorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { enrollments: true, lessons: true } },
      enrollments: { select: { progress: true } },
    },
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Courses"
        subtitle="Manage published and draft courses."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <BookOpen className="size-4 text-brand-purple" />
          <span>
            <strong className="text-brand-navy">{courses.length}</strong> courses
            in your catalog
          </span>
        </div>
        <Button href="/instructor/courses/create">New course</Button>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <p className="font-semibold text-brand-navy">No courses yet</p>
          <p className="mt-1 text-sm text-muted">
            Create your first draft to start teaching.
          </p>
          <div className="mt-4">
            <Button href="/instructor/courses/create">New course</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const avgCompletion =
              course.enrollments.length === 0
                ? 0
                : Math.round(
                    course.enrollments.reduce((sum, e) => sum + e.progress, 0) /
                      course.enrollments.length,
                  );
            const label = statusLabel(course.status);
            return (
              <Link
                key={course.id}
                href={`/instructor/courses/${course.slug}`}
                className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-brand-purple/25"
              >
                <img
                  src={resolveMediaUrl(course.thumbnail)}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">
                      {course.category ?? "Course"}
                    </p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        course.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-semibold text-[#324361]">
                    {course.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {course._count.enrollments.toLocaleString()} students ·{" "}
                    {formatPrice(course.price)}
                  </p>
                  <div className="mt-4">
                    <ProgressBar
                      value={avgCompletion}
                      label="Avg. completion"
                    />
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple">
                    Open
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
