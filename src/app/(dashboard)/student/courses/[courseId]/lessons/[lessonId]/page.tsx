import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LessonResourcesPanel } from "@/components/course/lesson-resources-panel";
import { CertificateProgress } from "@/components/student/certificate-progress";
import { LessonContent } from "@/components/student/lesson-content";
import { LessonStage } from "@/components/student/lesson-stage";
import { getServerSession } from "@/lib/auth";
import { loginRedirectPath } from "@/lib/page-guards";
import {
  flatLessonsFromCourse,
  getEnrolledStudentCourse,
} from "@/lib/student-course-data";

type Props = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

export default async function LessonPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect(await loginRedirectPath());

  const { courseId, lessonId } = await params;
  const course = await getEnrolledStudentCourse(session.user.id, courseId);
  if (!course) redirect(`/courses/${encodeURIComponent(courseId)}`);

  const lessons = flatLessonsFromCourse(course);
  const lessonIndex = lessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex < 0) notFound();

  const lesson = lessons[lessonIndex]!;
  const lessonModule = course.modules.find((m) =>
    m.lessons.some((l) => l.id === lesson.id),
  );
  const prev = lessons[lessonIndex - 1] ?? null;
  const next = lessons[lessonIndex + 1] ?? null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader
        backHref={`/student/courses/${course.slug}`}
        backLabel={course.title}
        title={lesson.title}
        subtitle={
          lessonModule
            ? `${lessonModule.title} · ${lesson.duration}`
            : lesson.duration
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <div className="min-w-0 space-y-5">
          <LessonStage
            key={lesson.id}
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            videoUrl={lesson.videoUrl}
            duration={lesson.duration}
            summary={lesson.summary}
            initialCompleted={lesson.completed}
            next={
              next
                ? {
                    href: `/student/courses/${course.slug}/lessons/${next.id}`,
                    title: next.title,
                  }
                : null
            }
            courseHref={`/student/courses/${course.slug}`}
          />

          <article className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-brand-navy">
              <FileText className="size-4 text-brand-purple" />
              Lesson content
            </h2>
            <div className="mt-4 space-y-3 break-words text-sm leading-relaxed text-[#324361] sm:text-[15px]">
              <LessonContent text={lesson.content} />
            </div>
          </article>

          {lesson.resources.length > 0 ? (
            <LessonResourcesPanel
              key={`resources-${lesson.id}`}
              resources={lesson.resources}
            />
          ) : null}

          <CertificateProgress
            variant="lesson"
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

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {prev ? (
              <Link
                href={`/student/courses/${course.slug}/lessons/${prev.id}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-4 text-sm font-semibold text-brand-navy transition hover:bg-surface"
              >
                <ArrowLeft className="size-4" />
                Previous
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/student/courses/${course.slug}/lessons/${next.id}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white transition hover:bg-brand-purple"
              >
                Next lesson
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <Link
                href={`/student/courses/${course.slug}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Back to course
                <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:sticky xl:top-6">
          <div className="border-b border-black/5 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-brand-navy">
              Course lessons
            </h2>
            <p className="text-xs text-muted">
              {course.completedLessons}/{course.totalLessons} complete
            </p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto py-2">
            {course.modules.map((mod) => (
              <div key={mod.id} className="px-2 pb-2">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {mod.title}
                </p>
                <ul>
                  {mod.lessons.map((item) => {
                    const active = item.id === lesson.id;
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/student/courses/${course.slug}/lessons/${item.id}`}
                          className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                            active
                              ? "bg-brand-blue text-white"
                              : "text-[#324361] hover:bg-surface"
                          }`}
                        >
                          {item.completed ? (
                            <CheckCircle2
                              className={`mt-0.5 size-4 shrink-0 ${
                                active ? "text-brand-mint" : "text-brand-teal"
                              }`}
                            />
                          ) : (
                            <Circle
                              className={`mt-0.5 size-4 shrink-0 ${
                                active ? "text-white/70" : "text-muted"
                              }`}
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block font-medium leading-snug">
                              {item.title}
                            </span>
                            <span
                              className={`mt-0.5 block text-xs ${
                                active ? "text-white/70" : "text-muted"
                              }`}
                            >
                              {item.duration}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
