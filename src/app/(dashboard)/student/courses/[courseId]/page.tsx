import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  Play,
} from "lucide-react";
import { CourseReviews } from "@/components/course/course-reviews";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { CertificateProgress } from "@/components/student/certificate-progress";
import { getServerSession } from "@/lib/auth";
import { formatLevel, pluralize } from "@/lib/format";
import { loginRedirectPath } from "@/lib/page-guards";
import {
  flatLessonsFromCourse,
  getEnrolledStudentCourse,
} from "@/lib/student-course-data";

type Props = { params: Promise<{ courseId: string }> };

export default async function StudentCoursePage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect(await loginRedirectPath());

  const { courseId } = await params;
  const course = await getEnrolledStudentCourse(session.user.id, courseId);
  // Not enrolled (or unknown course): the public page handles enroll/checkout.
  if (!course) redirect(`/courses/${encodeURIComponent(courseId)}`);

  const lessons = flatLessonsFromCourse(course);
  const next = lessons.find((l) => !l.completed) ?? lessons[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        backHref="/student/courses"
        backLabel="My courses"
        title={course.title}
        subtitle={`${course.category} · ${formatLevel(course.level)} · Instructor ${course.instructor}`}
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:p-5">
        <Image
          src={course.image}
          alt=""
          width={352}
          height={224}
          className="aspect-video w-full rounded-xl object-cover sm:aspect-auto sm:h-28 sm:w-44 sm:shrink-0"
        />
        <div className="min-w-0 flex-1">
          <ProgressBar value={course.progress} label="Overall progress" />
          <p className="mt-2 text-sm text-muted">
            {course.completedLessons} of {course.totalLessons} lessons complete
            {course.quizzes.length > 0
              ? ` · ${course.quizzes.length - course.remainingQuizzes.length} of ${pluralize(course.quizzes.length, "quiz", "quizzes")} passed`
              : ""}
          </p>
        </div>
        {next ? (
          <Link
            href={`/student/courses/${course.slug}/lessons/${next.id}`}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-semibold text-white transition hover:bg-brand-purple"
          >
            <Play className="size-4 fill-current" />
            {course.progress > 0 ? "Continue learning" : "Start course"}
          </Link>
        ) : null}
      </div>

      <CertificateProgress
        variant="course"
        courseSlug={course.slug}
        courseTitle={course.title}
        progress={course.progress}
        lessonsComplete={
          course.totalLessons > 0 &&
          course.completedLessons >= course.totalLessons
        }
        hasCertificate={Boolean(course.certificate)}
        remainingQuizzes={course.remainingQuizzes}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="space-y-5">
          <article className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              About this course
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              {course.about || "No description yet."}
            </p>
          </article>

          {course.outcomes.length > 0 ? (
            <article className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
              <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
                What you&apos;ll learn
              </h2>
              <ul className="mt-4 space-y-2.5">
                {course.outcomes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-[#324361]"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </section>

        <section className="rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="border-b border-black/5 px-5 py-4">
            <h2 className="text-base font-semibold text-brand-navy">
              Curriculum
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {pluralize(course.totalLessons, "lesson")}
            </p>
          </div>
          <div className="divide-y divide-black/5">
            {course.modules.map((mod) => (
              <div key={mod.id} className="px-2 py-3 sm:px-3">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {mod.title}
                </p>
                <ul>
                  {mod.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/student/courses/${course.slug}/lessons/${lesson.id}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface"
                      >
                        {lesson.completed ? (
                          <CheckCircle2 className="size-4 shrink-0 text-brand-teal" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-[#324361]">
                            {lesson.title}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                            <Clock3 className="size-3" />
                            {lesson.duration}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <CourseReviews courseId={course.id} />
    </div>
  );
}
