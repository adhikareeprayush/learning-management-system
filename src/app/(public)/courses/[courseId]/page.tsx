import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BookOpen,
  ClipboardCheck,
  Clock,
  FileText,
  ListChecks,
  MessageCircle,
  PlayCircle,
  Star,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Button } from "@/components/ui/button";
import { CourseReviews } from "@/components/course/course-reviews";
import { EnrollButton } from "@/components/course/enroll-button";
import { getServerSession } from "@/lib/auth";
import { isRequiredQuiz } from "@/lib/certificates";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { formatDuration, formatLevel } from "@/lib/format";
import { shareImageMetadata } from "@/lib/institute";
import { getLatestPaymentForCourse } from "@/lib/payments";
import { courseRequiresPayment, formatCoursePrice } from "@/lib/pricing";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { LessonPreviewRow } from "./lesson-preview";

function contentParagraphs(content: string | null) {
  return (content ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Published course by id or slug; shared by the page and its metadata. */
const loadPublishedCourse = cache(async (courseId: string) => {
  const ctx = await resolveTenantFromHeaders();
  if (!ctx) return null;
  return prisma.course.findFirst({
    where: {
      organizationId: ctx.organizationId,
      status: "PUBLISHED",
      OR: [{ id: courseId }, { slug: courseId }],
    },
    include: {
      instructor: { select: { name: true } },
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          duration: true,
          isFree: true,
          order: true,
          videoUrl: true,
          summary: true,
          content: true,
          resources: { select: { type: true, description: true } },
        },
      },
      _count: { select: { enrollments: true, assignments: true } },
      reviews: { select: { rating: true } },
    },
  });
});

type Props = { params: Promise<{ courseId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = await params;
  const course = await loadPublishedCourse(courseId);
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description:
      course.description?.slice(0, 160) ||
      `${formatLevel(course.level)} course taught by ${course.instructor.name}.`,
    alternates: { canonical: `/courses/${course.slug}` },
    ...(await shareImageMetadata(
      course.thumbnail ? resolveMediaUrl(course.thumbnail) : null,
      course.title,
    )),
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { courseId } = await params;
  const [session, ctx, course] = await Promise.all([
    getServerSession(),
    resolveTenantFromHeaders(),
    loadPublishedCourse(courseId),
  ]);
  if (!ctx || !course) notFound();

  const related = await prisma.course.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: "PUBLISHED",
      category: course.category,
      NOT: { id: course.id },
    },
    take: 3,
    include: {
      instructor: { select: { name: true } },
    },
  });

  const reviewCount = course.reviews.length;
  const avgRating =
    reviewCount === 0
      ? null
      : Math.round(
          (course.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) *
            10,
        ) / 10;

  const requiresPayment = courseRequiresPayment(course);
  const price = formatCoursePrice(course);
  const image = resolveMediaUrl(course.thumbnail);

  // Only instructor-enabled free lessons of this published course are exposed publicly.
  const lessons = course.lessons.map((lesson) => {
    const videoUrl = lesson.isFree ? lesson.videoUrl?.trim() || null : null;
    const summary = lesson.isFree ? lesson.summary?.trim() || null : null;
    const paragraphs = lesson.isFree ? contentParagraphs(lesson.content) : [];
    return {
      id: lesson.id,
      title: lesson.title,
      duration: formatDuration(lesson.duration),
      preview:
        videoUrl || summary || paragraphs.length > 0
          ? { videoUrl, summary, paragraphs }
          : null,
    };
  });
  const previewCount = lessons.filter((lesson) => lesson.preview).length;

  const resources = course.lessons.flatMap((lesson) => lesson.resources);
  const quizCount = resources.filter(isRequiredQuiz).length;
  const materialCount = resources.filter((resource) => resource.type !== "QUIZ").length;
  const assignmentCount = course._count.assignments;
  const totalMinutes =
    course.duration ||
    course.lessons.reduce((sum, lesson) => sum + lesson.duration, 0);

  const enrollment =
    session
      ? await prisma.enrollment.findUnique({
          where: {
            courseId_studentId: {
              courseId: course.id,
              studentId: session.user.id,
            },
          },
        })
      : null;

  const latestPayment =
    session && requiresPayment && !enrollment
      ? await getLatestPaymentForCourse(session.user.id, course.id)
      : null;

  const paymentStatus =
    latestPayment?.status === "PENDING"
      ? ("pending" as const)
      : latestPayment?.status === "FAILED"
        ? ("rejected" as const)
        : ("none" as const);
  const rejectionReason =
    latestPayment?.status === "FAILED" ? latestPayment.rejectionReason : null;

  return (
    <div className="bg-[#f7f8fc] pb-20">
      <section className="border-b border-black/5 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-5 sm:py-12 md:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-16 lg:py-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <span className="rounded-full bg-brand-teal/10 px-2.5 py-1 text-brand-teal">
                {course.category ?? "Course"}
              </span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-brand-navy">
                {formatLevel(course.level)}
              </span>
            </div>
            <h1 className="mt-4 font-display text-2xl leading-tight text-brand-navy sm:text-3xl md:text-5xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Taught by{" "}
              <strong className="text-[#324361]">{course.instructor.name}</strong>
              {course.description ? ` · ${course.description}` : null}
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-[#324361]">
              <span className="inline-flex items-center gap-1.5">
                <Star
                  className={`size-4 ${
                    avgRating == null
                      ? "text-muted"
                      : "fill-[#f5b942] text-[#f5b942]"
                  }`}
                />
                {avgRating == null
                  ? "No ratings yet"
                  : `${avgRating.toFixed(1)} rating · ${reviewCount} review${
                      reviewCount === 1 ? "" : "s"
                    }`}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4 text-brand-purple" />
                {course._count.enrollments.toLocaleString()} student
                {course._count.enrollments === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-brand-teal" />
                {formatDuration(totalMinutes)}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-start gap-3">
              <EnrollButton
                courseId={course.id}
                slug={course.slug}
                courseTitle={course.title}
                viewerRole={session?.user.role ?? null}
                priceLabel={price}
                requiresPayment={requiresPayment}
                paymentStatus={paymentStatus}
                rejectionReason={rejectionReason}
                alreadyEnrolled={Boolean(enrollment)}
              />
              <Button href="/courses" variant="secondary">
                Back to catalog
              </Button>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-3xl border border-black/5 bg-[#0b0a2e] shadow-xl">
            <div className="relative aspect-video">
              <Image
                src={image}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover opacity-90"
              />
              {previewCount > 0 ? (
                <a
                  href="#curriculum"
                  className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-brand-navy/85 to-transparent px-4 pb-3 pt-10 text-sm font-semibold text-white transition hover:text-brand-mint"
                >
                  <PlayCircle className="size-5" />
                  {previewCount} free preview lesson{previewCount === 1 ? "" : "s"}
                </a>
              ) : null}
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10 text-center text-white">
              <div className="px-3 py-4">
                <p className="text-lg font-semibold">{price}</p>
                <p className="text-xs text-white/60">
                  {requiresPayment ? "One-time payment" : "No payment needed"}
                </p>
              </div>
              <div className="px-3 py-4">
                <p className="text-lg font-semibold">{lessons.length}</p>
                <p className="text-xs text-white/60">
                  {lessons.length === 1 ? "Lesson" : "Lessons"}
                </p>
              </div>
              <div className="px-3 py-4">
                <p className="text-lg font-semibold">
                  {formatDuration(totalMinutes)}
                </p>
                <p className="text-xs text-white/60">Total length</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 md:px-10 lg:grid-cols-[1.4fr_0.6fr] lg:px-16">
        <div className="space-y-8">
          <section
            id="curriculum"
            className="scroll-mt-24 rounded-3xl border border-black/5 bg-white p-6 md:p-8"
          >
            <h2 className="font-display text-2xl text-brand-navy">Curriculum</h2>
            {previewCount > 0 ? (
              <p className="mt-1 text-sm text-muted">
                Open a free preview lesson to try it before you enroll.
              </p>
            ) : null}
            <ul className="mt-5 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5">
              {lessons.map((lesson, i) => (
                <li key={lesson.id}>
                  {lesson.preview ? (
                    <LessonPreviewRow
                      number={i + 1}
                      title={lesson.title}
                      duration={lesson.duration}
                      {...lesson.preview}
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                      <span className="flex min-w-0 flex-1 items-center gap-3 font-medium text-[#324361]">
                        <BookOpen className="size-4 shrink-0 text-brand-purple" />
                        <span className="line-clamp-2 min-w-0">
                          {i + 1}. {lesson.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm text-muted">
                        {lesson.duration}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {related.length > 0 ? (
            <section>
              <h2 className="font-display text-2xl text-brand-navy">
                More in {course.category}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/courses/${item.slug}`}
                    className="rounded-2xl border border-black/5 bg-white p-3 transition hover:shadow-md"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                      <Image
                        src={resolveMediaUrl(item.thumbnail)}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-[#324361]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-brand-navy">
                      {formatCoursePrice(item)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <CourseReviews courseId={course.id} />
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h3 className="font-display text-xl text-brand-navy">
              What you&apos;ll get
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2">
                <Award className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                {quizCount > 0
                  ? "A verifiable certificate once you complete every lesson and pass every quiz"
                  : "A verifiable certificate once you complete every lesson"}
              </li>
              {previewCount > 0 ? (
                <li className="flex items-start gap-2">
                  <PlayCircle className="mt-0.5 size-4 shrink-0 text-brand-purple" />
                  {plural(previewCount, "free preview lesson")} to try first
                </li>
              ) : null}
              {materialCount > 0 ? (
                <li className="flex items-start gap-2">
                  <FileText className="mt-0.5 size-4 shrink-0 text-brand-purple" />
                  {plural(materialCount, "lesson resource")} — readings,
                  exercises, and extra videos
                </li>
              ) : null}
              {quizCount > 0 ? (
                <li className="flex items-start gap-2">
                  <ListChecks className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                  {quizCount === 1 ? "1 quiz" : `${quizCount} quizzes`} to check
                  your understanding
                </li>
              ) : null}
              {assignmentCount > 0 ? (
                <li className="flex items-start gap-2">
                  <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-brand-navy" />
                  {plural(assignmentCount, "assignment")} graded by the
                  instructor
                </li>
              ) : null}
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-navy" />
                Rate and review the course when you finish
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                Self-paced — learn on your own schedule
              </li>
            </ul>
            {course.outcomes.length > 0 ? (
              <ul className="mt-5 space-y-2 border-t border-black/5 pt-4 text-sm text-[#324361]">
                {course.outcomes.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
