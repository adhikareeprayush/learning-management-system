import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CircleAlert,
  CircleCheck,
  CirclePlay,
  ClipboardList,
  ExternalLink,
  FileText,
  ImageOff,
  Layers,
  ListChecks,
  PenLine,
  Unlock,
  Video,
  VideoOff,
  type LucideIcon,
} from "lucide-react";
import type { CourseStatus, LessonResourceType } from "@prisma/client";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { UserAvatar } from "@/components/ui/user-avatar";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { parseQuizPayload } from "@/lib/lesson-resources";
import { loginRedirectPath, requireAdminPage } from "@/lib/page-guards";
import { formatCoursePrice } from "@/lib/pricing";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { CourseReviewActions } from "./course-review-actions";

type Props = { params: Promise<{ courseId: string }> };

const statusLabels: Record<CourseStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const statusStyles: Record<CourseStatus, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  IN_REVIEW: "bg-amber-50 text-amber-800",
  DRAFT: "bg-slate-100 text-slate-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

const levelLabels = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
} as const;

const resourceMeta: Record<LessonResourceType, { label: string; icon: LucideIcon }> = {
  VIDEO: { label: "Video", icon: CirclePlay },
  TEXT: { label: "Reading", icon: FileText },
  EXERCISE: { label: "Exercise", icon: PenLine },
  QUIZ: { label: "Quiz", icon: ListChecks },
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const lessonInclude = {
  orderBy: { order: "asc" },
  select: {
    id: true,
    title: true,
    summary: true,
    duration: true,
    isFree: true,
    videoUrl: true,
    resources: {
      orderBy: { createdAt: "asc" },
      select: { id: true, type: true, title: true, description: true },
    },
  },
} as const;

export default async function AdminCoursePreviewPage({ params }: Props) {
  await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: {
      organizationId: ctx.organizationId,
      OR: [{ id: courseId }, { slug: courseId }],
    },
    include: {
      instructor: { select: { id: true, name: true, email: true, image: true, deletedAt: true } },
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: lessonInclude },
      },
      lessons: { ...lessonInclude, where: { moduleId: null } },
      assignments: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          _count: { select: { submissions: true } },
        },
      },
      _count: { select: { lessons: true, enrollments: true, reviews: true } },
    },
  });

  if (!course) notFound();

  // Mirrors the completeness check in PATCH /api/courses/[courseId].
  const readiness = [
    { label: "Title", ok: Boolean(course.title.trim()) },
    { label: "Description", ok: Boolean(course.description?.trim()) },
    { label: "Category", ok: Boolean(course.category?.trim()) },
    { label: "Thumbnail", ok: Boolean(course.thumbnail?.trim()) },
    { label: "At least one lesson", ok: course._count.lessons > 0 },
  ];
  const missing = readiness.filter((item) => !item.ok).map((item) => item.label.toLowerCase());

  const sections = [
    ...course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      lessons: module.lessons,
    })),
    ...(course.lessons.length > 0
      ? [
          {
            id: "unassigned",
            title: course.modules.length > 0 ? "Lessons without a module" : "Lessons",
            description: null,
            lessons: course.lessons,
          },
        ]
      : []),
  ];

  const lessonsWithVideo = [...course.lessons, ...course.modules.flatMap((m) => m.lessons)].filter(
    (lesson) => Boolean(lesson.videoUrl?.trim()),
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title={course.title}
        subtitle={`Course review · ${statusLabels[course.status]}`}
        backHref={course.status === "IN_REVIEW" ? "/admin/moderation" : "/admin/courses"}
        backLabel={course.status === "IN_REVIEW" ? "Moderation" : "Courses"}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
        <div className="min-w-0 space-y-4 lg:space-y-5">
          <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
              {course.thumbnail ? (
                // Thumbnails can come from any host an instructor pasted, so skip next/image's allow-list.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(course.thumbnail)}
                  alt=""
                  className="aspect-video h-full w-full bg-surface object-cover md:aspect-auto"
                />
              ) : (
                <div className="grid aspect-video place-items-center bg-surface text-muted md:aspect-auto">
                  <span className="flex flex-col items-center gap-2 text-sm">
                    <ImageOff className="size-6" />
                    No thumbnail uploaded
                  </span>
                </div>
              )}
              <div className="min-w-0 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusStyles[course.status]}`}
                  >
                    {statusLabels[course.status]}
                  </span>
                  {course.featured ? (
                    <span className="rounded-md bg-brand-purple/10 px-2.5 py-1 text-xs font-semibold text-brand-purple">
                      Featured
                    </span>
                  ) : null}
                  <span className="text-xs text-muted">
                    Updated {dateFormatter.format(course.updatedAt)}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-xl text-brand-navy sm:text-2xl">
                  {course.title}
                </h2>
                {course.description?.trim() ? (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#324361]">
                    {course.description}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-muted">No description yet.</p>
                )}
                {course.outcomes.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Learning outcomes
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {course.outcomes.map((outcome, index) => (
                        <li key={index} className="flex gap-2 text-sm text-[#324361]">
                          <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-brand-purple" />
                <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
                  Curriculum
                </h2>
              </div>
              <p className="text-sm text-muted">
                {course.modules.length} module{course.modules.length === 1 ? "" : "s"} ·{" "}
                {course._count.lessons} lesson{course._count.lessons === 1 ? "" : "s"} ·{" "}
                {lessonsWithVideo} with video
              </p>
            </div>

            {sections.length === 0 ? (
              <p className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-muted">
                This course has no lessons yet.
              </p>
            ) : (
              <div className="space-y-4">
                {sections.map((section, sectionIndex) => (
                  <div key={section.id} className="rounded-xl border border-black/5">
                    <div className="border-b border-black/5 bg-surface/60 px-4 py-3">
                      <p className="text-sm font-semibold text-brand-navy">
                        {section.id === "unassigned"
                          ? section.title
                          : `Module ${sectionIndex + 1} · ${section.title}`}
                      </p>
                      {section.description ? (
                        <p className="mt-0.5 text-xs text-muted">{section.description}</p>
                      ) : null}
                    </div>
                    {section.lessons.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted">No lessons in this module.</p>
                    ) : (
                      <ol className="divide-y divide-black/5">
                        {section.lessons.map((lesson) => (
                          <li key={lesson.id} className="px-4 py-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#324361]">
                                  {lesson.title}
                                </p>
                                {lesson.summary ? (
                                  <p className="mt-0.5 text-xs text-muted">{lesson.summary}</p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs">
                                <span className="rounded-md bg-surface px-2 py-0.5 text-muted">
                                  {formatMinutes(lesson.duration)}
                                </span>
                                {lesson.videoUrl?.trim() ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                                    <Video className="size-3" />
                                    Video
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                                    <VideoOff className="size-3" />
                                    No video
                                  </span>
                                )}
                                {lesson.isFree ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-teal/10 px-2 py-0.5 font-medium text-[#0d8f7a]">
                                    <Unlock className="size-3" />
                                    Free preview
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            {lesson.resources.length > 0 ? (
                              <ul className="mt-2 flex flex-wrap gap-1.5">
                                {lesson.resources.map((resource) => {
                                  const meta = resourceMeta[resource.type];
                                  const Icon = meta.icon;
                                  const questionCount =
                                    resource.type === "QUIZ"
                                      ? (parseQuizPayload(resource.description)?.questions.length ?? 0)
                                      : null;
                                  return (
                                    <li
                                      key={resource.id}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/5 px-2 py-1 text-xs text-[#324361]"
                                    >
                                      <Icon className="size-3.5 text-brand-purple" />
                                      <span className="font-medium">{meta.label}</span>
                                      <span className="text-muted">· {resource.title}</span>
                                      {questionCount !== null ? (
                                        <span
                                          className={
                                            questionCount === 0 ? "text-red-600" : "text-muted"
                                          }
                                        >
                                          · {questionCount} question{questionCount === 1 ? "" : "s"}
                                        </span>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="size-4 text-brand-purple" />
              <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
                Assignments
              </h2>
            </div>
            {course.assignments.length === 0 ? (
              <p className="text-sm text-muted">No assignments.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {course.assignments.map((assignment) => (
                  <li key={assignment.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm font-medium text-[#324361]">{assignment.title}</p>
                      <p className="shrink-0 text-xs text-muted">
                        {assignment.dueDate
                          ? `Due ${dateFormatter.format(assignment.dueDate)}`
                          : "No due date"}{" "}
                        · {assignment._count.submissions} submission
                        {assignment._count.submissions === 1 ? "" : "s"}
                      </p>
                    </div>
                    {assignment.description ? (
                      <p className="mt-1 line-clamp-3 text-xs text-muted">
                        {assignment.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:space-y-5">
          <section
            id="moderation"
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5"
          >
            <h2 className="text-base font-semibold text-brand-navy">Moderation</h2>
            <p className="mt-1 text-sm text-muted">
              Status:{" "}
              <span className="font-semibold text-brand-navy">
                {statusLabels[course.status]}
              </span>
            </p>
            {course.reviewNote || course.reviewedAt ? (
              <div className="mt-3 rounded-xl border border-black/5 bg-surface/70 px-3 py-2.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Last review{course.reviewedAt ? ` · ${dateFormatter.format(course.reviewedAt)}` : ""}
                </p>
                {course.reviewNote ? (
                  <p className="mt-1 whitespace-pre-line text-[#324361]">{course.reviewNote}</p>
                ) : (
                  <p className="mt-1 text-muted">No note was left.</p>
                )}
              </div>
            ) : null}
            <div className="mt-4">
              <CourseReviewActions
                courseId={course.id}
                status={course.status}
                missing={missing}
                featured={course.featured}
              />
            </div>
            {course.status === "PUBLISHED" ? (
              <Link
                href={`/courses/${course.slug}`}
                target="_blank"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:text-brand-teal"
              >
                Open public page
                <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <h2 className="text-base font-semibold text-brand-navy">Publishing checklist</h2>
            <ul className="mt-3 space-y-2">
              {readiness.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  {item.ok ? (
                    <CircleCheck className="size-4 shrink-0 text-brand-teal" />
                  ) : (
                    <CircleAlert className="size-4 shrink-0 text-red-600" />
                  )}
                  <span className={item.ok ? "text-[#324361]" : "font-medium text-red-700"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <h2 className="text-base font-semibold text-brand-navy">Instructor</h2>
            <Link
              href={`/admin/users?q=${encodeURIComponent(course.instructor.email)}${
                course.instructor.deletedAt ? "&status=deleted" : ""
              }`}
              className="mt-3 flex items-center gap-3 rounded-xl border border-black/5 p-3 transition hover:border-brand-purple/25 hover:bg-surface/70"
            >
              <UserAvatar name={course.instructor.name} image={course.instructor.image} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#324361]">
                  {course.instructor.name}
                </span>
                <span className="block truncate text-xs text-muted">
                  {course.instructor.email}
                </span>
              </span>
            </Link>

            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Price</dt>
                <dd className="font-semibold text-brand-navy">{formatCoursePrice(course)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Level</dt>
                <dd className="font-semibold text-brand-navy">{levelLabels[course.level]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Category</dt>
                <dd className="font-semibold text-brand-navy">{course.category || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Duration</dt>
                <dd className="font-semibold text-brand-navy">{formatMinutes(course.duration)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Enrollments</dt>
                <dd className="font-semibold text-brand-navy">{course._count.enrollments}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Reviews</dt>
                <dd className="font-semibold text-brand-navy">{course._count.reviews}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Created</dt>
                <dd className="font-semibold text-brand-navy">
                  {dateFormatter.format(course.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Slug</dt>
                <dd className="truncate font-mono text-xs text-brand-navy">{course.slug}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
