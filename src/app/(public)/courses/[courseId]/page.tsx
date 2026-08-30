import Link from "next/link";
import {
  Award,
  BookOpen,
  Clock,
  Download,
  MessageCircle,
  PlayCircle,
  Star,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CourseReviews } from "@/components/course/course-reviews";
import { EnrollButton } from "@/components/course/enroll-button";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLatestPaymentForCourse } from "@/lib/payments";
import {
  coursePaymentAmountPaisa,
  courseRequiresPayment,
  formatNprFromPaisa,
} from "@/lib/pricing";
import { resolveMediaUrl } from "@/lib/imagekit-url";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatLevel(level: string) {
  if (level === "BEGINNER") return "Beginner";
  if (level === "INTERMEDIATE") return "Intermediate";
  if (level === "ADVANCED") return "Advanced";
  return level;
}

type Props = { params: Promise<{ courseId: string }> };

export default async function CourseDetailPage({ params }: Props) {
  const { courseId } = await params;
  const session = await getServerSession();

  const course = await prisma.course.findFirst({
    where: {
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
        },
      },
      _count: { select: { enrollments: true } },
      reviews: { select: { rating: true } },
    },
  });

  if (!course) notFound();

  const related = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      category: course.category,
      NOT: { id: course.id },
    },
    take: 3,
    include: {
      instructor: { select: { name: true } },
    },
  });

  const avgRating =
    course.reviews.length === 0
      ? 5
      : Math.round(
          (course.reviews.reduce((sum, r) => sum + r.rating, 0) /
            course.reviews.length) *
            10,
        ) / 10;

  const requiresPayment = courseRequiresPayment(course);
  const price = requiresPayment
    ? formatNprFromPaisa(coursePaymentAmountPaisa(course))
    : formatPrice(course.price);
  const image = resolveMediaUrl(course.thumbnail);

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
                <Star className="size-4 fill-[#f5b942] text-[#f5b942]" />
                {avgRating} rating
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4 text-brand-purple" />
                {course._count.enrollments.toLocaleString()} students
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-brand-teal" />
                {formatDuration(course.duration)}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-start gap-3">
              <EnrollButton
                courseId={course.id}
                slug={course.slug}
                courseTitle={course.title}
                priceLabel={price}
                requiresPayment={requiresPayment}
                paymentStatus={paymentStatus}
                alreadyEnrolled={
                  Boolean(enrollment) && session?.user.role === "STUDENT"
                }
              />
              <Button href="/courses" variant="secondary">
                Back to catalog
              </Button>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-3xl border border-black/5 bg-[#0b0a2e] shadow-xl">
            <div className="relative aspect-video">
              <img
                src={image}
                alt=""
                className="size-full object-cover opacity-90"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-brand-navy/25">
                <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-brand-navy shadow-lg">
                  <PlayCircle className="size-8" />
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10 text-center text-white">
              <div className="px-3 py-4">
                <p className="text-lg font-semibold">{price}</p>
                <p className="text-xs text-white/60">One-time</p>
              </div>
              <div className="px-3 py-4">
                <p className="text-lg font-semibold">{course.lessons.length}</p>
                <p className="text-xs text-white/60">Lessons</p>
              </div>
              <div className="px-3 py-4">
                <p className="text-lg font-semibold">Full</p>
                <p className="text-xs text-white/60">Access</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 md:px-10 lg:grid-cols-[1.4fr_0.6fr] lg:px-16">
        <div className="space-y-8">
          <section className="rounded-3xl border border-black/5 bg-white p-6 md:p-8">
            <h2 className="font-display text-2xl text-brand-navy">Curriculum</h2>
            <ul className="mt-5 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5">
              {course.lessons.map((lesson, i) => (
                <li key={lesson.id}>
                  <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <span className="flex min-w-0 flex-1 items-center gap-3 font-medium text-[#324361]">
                      <BookOpen className="size-4 shrink-0 text-brand-purple" />
                      <span className="min-w-0">
                        <span className="line-clamp-2">
                          {i + 1}. {lesson.title}
                        </span>
                        {lesson.isFree ? (
                          <span className="mt-1 inline-block rounded bg-brand-teal/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-teal">
                            Preview
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-muted">
                      {formatDuration(lesson.duration)}
                    </span>
                  </div>
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
                    <img
                      src={resolveMediaUrl(item.thumbnail)}
                      alt=""
                      className="aspect-video w-full rounded-xl object-cover"
                    />
                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-[#324361]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-brand-navy">
                      {formatPrice(item.price)}
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
                <Award className="mt-0.5 size-4 text-brand-teal" />
                Certificate of completion
              </li>
              <li className="flex items-start gap-2">
                <Download className="mt-0.5 size-4 text-brand-purple" />
                Project files & templates
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 size-4 text-brand-navy" />
                Course reviews when you finish
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 text-brand-teal" />
                Access while enrolled
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
