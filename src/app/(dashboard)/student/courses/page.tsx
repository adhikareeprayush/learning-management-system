import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Play,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";

async function getStudentEnrollments(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        include: {
          instructor: { select: { name: true } },
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, order: true },
          },
        },
      },
    },
  });

  const lessonIds = enrollments.flatMap((e) =>
    e.course.lessons.map((l) => l.id),
  );

  const completedRows = lessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: {
          studentId,
          lessonId: { in: lessonIds },
          completed: true,
        },
        select: { lessonId: true },
      })
    : [];

  const completedLessonIds = new Set(completedRows.map((row) => row.lessonId));

  return enrollments.map((enrollment) => {
    const course = enrollment.course;
    const lessons = course.lessons;
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((l) =>
      completedLessonIds.has(l.id),
    ).length;
    const progress =
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100);
    const next = lessons.find((l) => !completedLessonIds.has(l.id));

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      category: course.category,
      image: resolveMediaUrl(course.thumbnail),
      instructor: course.instructor.name,
      progress,
      totalLessons,
      completedLessons,
      nextLesson: next,
    };
  });
}

export default async function StudentCoursesPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const courses = await getStudentEnrollments(session.user.id);
  const inProgress = courses.filter((c) => c.progress < 100);
  const completed = courses.filter((c) => c.progress >= 100);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="My courses"
        subtitle="Your enrollments from the database — continue where you left off."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <BookOpen className="size-4 text-brand-purple" />
          <strong className="text-brand-navy">{courses.length}</strong> enrolled
        </span>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 font-semibold text-brand-purple transition hover:text-brand-teal"
        >
          Browse catalog
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <p className="font-semibold text-brand-navy">No enrollments yet</p>
          <p className="mt-1 text-sm text-muted">
            Browse the catalog and enroll in a published course.
          </p>
          <Link
            href="/courses"
            className="mt-4 inline-flex rounded-xl bg-[#083f9b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-purple"
          >
            Explore courses
          </Link>
        </div>
      ) : null}

      {inProgress.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="border-b border-black/5 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-brand-navy">In progress</h2>
          </div>
          <ul className="divide-y divide-black/5">
            {inProgress.map((course) => (
              <li key={course.id}>
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <Link
                    href={`/student/courses/${course.slug}`}
                    className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-90"
                  >
                    <img
                      src={course.image}
                      alt=""
                      className="size-12 shrink-0 rounded-lg object-cover sm:size-14"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#324361]">
                        {course.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">
                        {course.instructor} · {course.completedLessons}/
                        {course.totalLessons} lessons
                        {course.nextLesson
                          ? ` · Next: ${course.nextLesson.title}`
                          : ""}
                      </p>
                      <div className="mt-2 max-w-xs sm:max-w-sm">
                        <ProgressBar value={course.progress} />
                      </div>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch lg:flex-row">
                    <Link
                      href={`/student/courses/${course.slug}`}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-black/8 px-3 text-sm font-semibold text-brand-navy transition hover:bg-surface"
                    >
                      Details
                    </Link>
                    <Link
                      href={
                        course.nextLesson
                          ? `/student/courses/${course.slug}/lessons/${course.nextLesson.id}`
                          : `/student/courses/${course.slug}`
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#083f9b] px-3 text-sm font-semibold text-white transition hover:bg-brand-purple"
                    >
                      <Play className="size-3.5 fill-current" />
                      Continue
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="border-b border-black/5 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-brand-navy">Completed</h2>
          </div>
          <ul className="divide-y divide-black/5">
            {completed.map((course) => (
              <li
                key={course.id}
                className="flex items-center gap-3 px-4 py-4 sm:px-5"
              >
                <CheckCircle2 className="size-5 shrink-0 text-brand-teal" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#324361]">
                    {course.title}
                  </p>
                  <p className="text-xs text-muted">{course.instructor}</p>
                </div>
                <Link
                  href={`/student/courses/${course.slug}#course-reviews`}
                  className="text-sm font-semibold text-brand-purple transition hover:text-brand-teal"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : courses.length > 0 ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <Circle className="size-3.5" />
          No completed courses yet — keep going.
        </p>
      ) : null}
    </div>
  );
}
