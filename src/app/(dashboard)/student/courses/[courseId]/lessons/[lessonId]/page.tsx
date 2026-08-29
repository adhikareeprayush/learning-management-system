import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  Star,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { VideoPlayer } from "@/components/course/video-player";
import { LessonCompleteToggle } from "@/components/course/lesson-complete-toggle";
import {
  LessonResourcesPanel,
  type StudentLessonResource,
} from "@/components/course/lesson-resources-panel";
import { getServerSession } from "@/lib/auth";
import {
  flatLessonsFromCourse,
  getEnrolledStudentCourse,
} from "@/lib/student-course-data";

type Props = {
  params: Promise<{ courseId: string; lessonId: string }>;
};

export default async function LessonPage({ params }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const { courseId, lessonId } = await params;
  const course = await getEnrolledStudentCourse(session.user.id, courseId);
  if (!course) notFound();

  const lessons = flatLessonsFromCourse(course);
  const lessonIndex = lessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex < 0) notFound();

  const lesson = lessons[lessonIndex]!;
  const module =
    course.modules.find((m) => m.lessons.some((l) => l.id === lesson.id)) ??
    course.modules[0]!;
  const prev = lessons[lessonIndex - 1] ?? null;
  const next = lessons[lessonIndex + 1] ?? null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader
        backHref={`/student/courses/${course.slug}`}
        backLabel={course.title}
        title={lesson.title}
        subtitle={`${module.title} · ${lesson.duration}`}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <div className="min-w-0 space-y-5">
          {lesson.videoUrl ? (
            <VideoPlayer url={lesson.videoUrl} title={lesson.title} />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-brand-navy/90 text-sm text-white/80">
              No video for this lesson yet
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <LessonCompleteToggle
                lessonId={lesson.id}
                initialCompleted={Boolean(lesson.completed)}
                lessonTitle={lesson.title}
              />
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Clock3 className="size-3.5" />
                {lesson.duration}
              </span>
            </div>
            {lesson.summary ? (
              <p className="mt-2 text-sm text-muted sm:text-base">
                {lesson.summary}
              </p>
            ) : null}
          </div>

          <article className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-brand-navy">
              <FileText className="size-4 text-brand-purple" />
              Lesson content
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#324361] sm:text-[15px]">
              {lesson.content.length > 0 ? (
                lesson.content.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              ) : (
                <p className="text-muted">No written content for this lesson.</p>
              )}
            </div>
          </article>

          {"resources" in lesson && (lesson as { resources: StudentLessonResource[] }).resources.length > 0 ? (
            <LessonResourcesPanel
              resources={(lesson as { resources: StudentLessonResource[] }).resources}
            />
          ) : null}

          {course.progress >= 100 ? (
            <div className="rounded-2xl border border-brand-teal/20 bg-[#e8faf6] px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-start gap-3">
                <Star className="mt-0.5 size-5 shrink-0 fill-[#f5b942] text-[#f5b942]" />
                <div>
                  <p className="text-sm font-semibold text-brand-navy">
                    Course complete!
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    Tell others what you thought of {course.title}.
                  </p>
                </div>
              </div>
              <Link
                href={`/student/courses/${course.slug}#course-reviews`}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-brand-teal px-4 text-sm font-semibold text-white transition hover:brightness-110 sm:mt-0"
              >
                Write a review
              </Link>
            </div>
          ) : null}

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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#083f9b] px-4 text-sm font-semibold text-white transition hover:bg-brand-purple"
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
                              ? "bg-[#083f9b] text-white"
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
