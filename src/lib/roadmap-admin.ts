import type {
  CourseStatus,
  Level,
  Prisma,
  RoadmapStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { recalculateRoadmapProgress } from "@/lib/roadmaps";

export const ROADMAP_STATUSES: readonly RoadmapStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
];
export const ROADMAP_LEVELS: readonly Level[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
];

export const ROADMAP_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 80;
const TITLE_MAX = 160;
const DESCRIPTION_MAX = 5000;
const CATEGORY_MAX = 80;
const THUMBNAIL_MAX = 2048;
const OUTCOME_MAX = 300;
const MAX_OUTCOMES = 20;
const MAX_COURSES = 50;
const MAX_ESTIMATED_HOURS = 1000;

export type AdminRoadmapSummary = {
  id: string;
  slug: string;
  title: string;
  status: RoadmapStatus;
  level: Level;
  category: string | null;
  featured: boolean;
  courseCount: number;
  publishedCourseCount: number;
  enrollmentCount: number;
  certificateCount: number;
  updatedAt: string;
};

export type AdminRoadmapCourse = {
  id: string;
  slug: string;
  title: string;
  status: CourseStatus;
  category: string | null;
  price: number;
  priceNpr: number;
  duration: number;
  instructorName: string;
};

export type AdminRoadmapDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  category: string | null;
  level: Level;
  status: RoadmapStatus;
  outcomes: string[];
  estimatedHours: number;
  featured: boolean;
  enrollmentCount: number;
  certificateCount: number;
  createdAt: string;
  updatedAt: string;
  courses: AdminRoadmapCourse[];
};

/** Validated, normalized fields. `undefined` means "not provided". */
export type RoadmapInput = {
  title?: string;
  /** Empty string asks for a slug generated from the title. */
  slug?: string;
  description?: string | null;
  thumbnail?: string | null;
  category?: string | null;
  level?: Level;
  status?: RoadmapStatus;
  outcomes?: string[];
  estimatedHours?: number;
  featured?: boolean;
  courseIds?: string[];
};

export type RoadmapMutationResult =
  | { ok: true; roadmap: AdminRoadmapDetail; coursesChanged: boolean }
  | { ok: false; error: string; status: number };

type ParseResult =
  | { ok: true; input: RoadmapInput }
  | { ok: false; error: string };

const courseSelect = {
  id: true,
  slug: true,
  title: true,
  status: true,
  category: true,
  price: true,
  priceNpr: true,
  duration: true,
  instructor: { select: { name: true } },
} satisfies Prisma.CourseSelect;

type CourseRow = Prisma.CourseGetPayload<{ select: typeof courseSelect }>;

const detailInclude = {
  courses: {
    orderBy: { order: "asc" },
    include: { course: { select: courseSelect } },
  },
  _count: { select: { enrollments: true, certificates: true } },
} satisfies Prisma.RoadmapInclude;

type RoadmapDetailRow = Prisma.RoadmapGetPayload<{
  include: typeof detailInclude;
}>;

function toAdminCourse(course: CourseRow): AdminRoadmapCourse {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    status: course.status,
    category: course.category,
    price: course.price,
    priceNpr: course.priceNpr,
    duration: course.duration,
    instructorName: course.instructor.name,
  };
}

function toAdminDetail(roadmap: RoadmapDetailRow): AdminRoadmapDetail {
  return {
    id: roadmap.id,
    slug: roadmap.slug,
    title: roadmap.title,
    description: roadmap.description,
    thumbnail: roadmap.thumbnail,
    category: roadmap.category,
    level: roadmap.level,
    status: roadmap.status,
    outcomes: roadmap.outcomes,
    estimatedHours: roadmap.estimatedHours,
    featured: roadmap.featured,
    enrollmentCount: roadmap._count.enrollments,
    certificateCount: roadmap._count.certificates,
    createdAt: roadmap.createdAt.toISOString(),
    updatedAt: roadmap.updatedAt.toISOString(),
    courses: roadmap.courses.map((item) => toAdminCourse(item.course)),
  };
}

export function slugifyRoadmapTitle(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableText(
  value: unknown,
  field: string,
  max: number,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string or null` };
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    return { ok: false, error: `${field} must be at most ${max} characters` };
  }
  return { ok: true, value: trimmed || null };
}

export function parseRoadmapInput(
  body: unknown,
  mode: "create" | "update",
): ParseResult {
  if (!isRecord(body)) return { ok: false, error: "Request body must be a JSON object" };
  const input: RoadmapInput = {};

  if (body.title !== undefined || mode === "create") {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { ok: false, error: "title is required" };
    }
    const title = body.title.trim();
    if (title.length > TITLE_MAX) {
      return { ok: false, error: `title must be at most ${TITLE_MAX} characters` };
    }
    input.title = title;
  }

  if (body.slug !== undefined && body.slug !== null) {
    if (typeof body.slug !== "string") {
      return { ok: false, error: "slug must be a string" };
    }
    const slug = body.slug.trim().toLowerCase();
    if (slug && (slug.length > SLUG_MAX || !ROADMAP_SLUG_PATTERN.test(slug))) {
      return {
        ok: false,
        error: `slug must be at most ${SLUG_MAX} characters of lowercase letters, numbers, and single hyphens (e.g. "web-developer-path")`,
      };
    }
    input.slug = slug;
  } else if (body.slug === null) {
    input.slug = "";
  }

  for (const [field, max] of [
    ["description", DESCRIPTION_MAX],
    ["category", CATEGORY_MAX],
  ] as const) {
    if (body[field] === undefined) continue;
    const result = nullableText(body[field], field, max);
    if (!result.ok) return result;
    input[field] = result.value;
  }

  if (body.thumbnail !== undefined) {
    const result = nullableText(body.thumbnail, "thumbnail", THUMBNAIL_MAX);
    if (!result.ok) return result;
    const url = result.value;
    if (url && !/^https?:\/\/\S+$/i.test(url) && !/^\/(?!\/)\S*$/.test(url)) {
      return {
        ok: false,
        error: "thumbnail must be an http(s) URL or a site path starting with /",
      };
    }
    input.thumbnail = url;
  }

  if (body.level !== undefined) {
    if (!ROADMAP_LEVELS.includes(body.level as Level)) {
      return { ok: false, error: `level must be one of ${ROADMAP_LEVELS.join(", ")}` };
    }
    input.level = body.level as Level;
  }

  if (body.status !== undefined) {
    if (!ROADMAP_STATUSES.includes(body.status as RoadmapStatus)) {
      return {
        ok: false,
        error: `status must be one of ${ROADMAP_STATUSES.join(", ")}`,
      };
    }
    input.status = body.status as RoadmapStatus;
  }

  if (body.outcomes !== undefined) {
    if (
      !Array.isArray(body.outcomes) ||
      body.outcomes.some((item) => typeof item !== "string")
    ) {
      return { ok: false, error: "outcomes must be an array of strings" };
    }
    const outcomes = (body.outcomes as string[])
      .map((item) => item.trim())
      .filter(Boolean);
    if (outcomes.length > MAX_OUTCOMES) {
      return { ok: false, error: `outcomes can have at most ${MAX_OUTCOMES} items` };
    }
    if (outcomes.some((item) => item.length > OUTCOME_MAX)) {
      return {
        ok: false,
        error: `each outcome must be at most ${OUTCOME_MAX} characters`,
      };
    }
    input.outcomes = outcomes;
  }

  if (body.estimatedHours !== undefined) {
    const hours =
      typeof body.estimatedHours === "string" && body.estimatedHours.trim()
        ? Number(body.estimatedHours)
        : body.estimatedHours;
    if (
      typeof hours !== "number" ||
      !Number.isInteger(hours) ||
      hours < 0 ||
      hours > MAX_ESTIMATED_HOURS
    ) {
      return {
        ok: false,
        error: `estimatedHours must be a whole number between 0 and ${MAX_ESTIMATED_HOURS}`,
      };
    }
    input.estimatedHours = hours;
  }

  if (body.featured !== undefined) {
    if (typeof body.featured !== "boolean") {
      return { ok: false, error: "featured must be true or false" };
    }
    input.featured = body.featured;
  }

  if (body.courseIds !== undefined) {
    if (
      !Array.isArray(body.courseIds) ||
      body.courseIds.some((id) => typeof id !== "string" || !id.trim())
    ) {
      return { ok: false, error: "courseIds must be an array of course ids" };
    }
    const courseIds = (body.courseIds as string[]).map((id) => id.trim());
    if (new Set(courseIds).size !== courseIds.length) {
      return { ok: false, error: "courseIds must not contain duplicates" };
    }
    if (courseIds.length > MAX_COURSES) {
      return {
        ok: false,
        error: `A roadmap can have at most ${MAX_COURSES} courses`,
      };
    }
    input.courseIds = courseIds;
  }

  return { ok: true, input };
}

type Db = Prisma.TransactionClient | typeof prisma;

async function uniqueSlug(
  db: Db,
  organizationId: string,
  title: string,
  excludeId?: string,
) {
  const base = slugifyRoadmapTitle(title) || "roadmap";
  const taken = new Set(
    (
      await db.roadmap.findMany({
        where: {
          organizationId,
          slug: { startsWith: base },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { slug: true },
      })
    ).map((row) => row.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

async function slugTaken(
  db: Db,
  organizationId: string,
  slug: string,
  excludeId?: string,
) {
  const existing = await db.roadmap.findFirst({
    where: {
      organizationId,
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

/**
 * Courses of any status from the same org may be linked: the learner-facing
 * reads in roadmaps.ts only surface PUBLISHED courses, so drafts stay hidden
 * until they go live, and a course unpublished later doesn't break the path.
 */
async function resolveCourses(
  db: Db,
  organizationId: string,
  courseIds: string[],
): Promise<
  | { ok: true; courses: { id: string; status: CourseStatus }[] }
  | { ok: false; error: string }
> {
  if (courseIds.length === 0) return { ok: true, courses: [] };
  const courses = await db.course.findMany({
    where: { organizationId, id: { in: courseIds } },
    select: { id: true, status: true },
  });
  if (courses.length !== courseIds.length) {
    const found = new Set(courses.map((course) => course.id));
    const missing = courseIds.filter((id) => !found.has(id));
    return {
      ok: false,
      error: `Unknown course id(s): ${missing.join(", ")}`,
    };
  }
  return { ok: true, courses };
}

const PUBLISH_NEEDS_COURSE =
  "Add at least one published course before publishing this roadmap";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

/** Thrown inside a transaction to roll it back with an HTTP status. */
class MutationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function listAdminRoadmaps(
  organizationId: string,
): Promise<AdminRoadmapSummary[]> {
  const roadmaps = await prisma.roadmap.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      courses: { select: { course: { select: { status: true } } } },
      _count: { select: { enrollments: true, certificates: true } },
    },
  });

  return roadmaps.map((roadmap) => ({
    id: roadmap.id,
    slug: roadmap.slug,
    title: roadmap.title,
    status: roadmap.status,
    level: roadmap.level,
    category: roadmap.category,
    featured: roadmap.featured,
    courseCount: roadmap.courses.length,
    publishedCourseCount: roadmap.courses.filter(
      (item) => item.course.status === "PUBLISHED",
    ).length,
    enrollmentCount: roadmap._count.enrollments,
    certificateCount: roadmap._count.certificates,
    updatedAt: roadmap.updatedAt.toISOString(),
  }));
}

export async function getAdminRoadmap(
  organizationId: string,
  roadmapId: string,
): Promise<AdminRoadmapDetail | null> {
  const roadmap = await prisma.roadmap.findFirst({
    where: { id: roadmapId, organizationId },
    include: detailInclude,
  });
  return roadmap ? toAdminDetail(roadmap) : null;
}

/** Every course in the org, for the roadmap course picker. */
export async function listRoadmapCourseOptions(
  organizationId: string,
): Promise<AdminRoadmapCourse[]> {
  const courses = await prisma.course.findMany({
    where: { organizationId },
    orderBy: { title: "asc" },
    select: courseSelect,
  });
  return courses.map(toAdminCourse);
}

export async function createRoadmap(
  organizationId: string,
  input: RoadmapInput,
): Promise<RoadmapMutationResult> {
  const title = input.title ?? "";
  const status = input.status ?? "DRAFT";
  const courseIds = input.courseIds ?? [];

  try {
    const roadmap = await prisma.$transaction(async (tx) => {
      const resolved = await resolveCourses(tx, organizationId, courseIds);
      if (!resolved.ok) throw new MutationError(resolved.error, 400);
      if (
        status === "PUBLISHED" &&
        !resolved.courses.some((course) => course.status === "PUBLISHED")
      ) {
        throw new MutationError(PUBLISH_NEEDS_COURSE, 400);
      }

      let slug = input.slug;
      if (slug) {
        if (await slugTaken(tx, organizationId, slug)) {
          throw new MutationError(`Another roadmap already uses the slug "${slug}"`, 409);
        }
      } else {
        slug = await uniqueSlug(tx, organizationId, title);
      }

      return tx.roadmap.create({
        data: {
          organizationId,
          title,
          slug,
          description: input.description ?? null,
          thumbnail: input.thumbnail ?? null,
          category: input.category ?? null,
          level: input.level ?? "BEGINNER",
          status,
          outcomes: input.outcomes ?? [],
          estimatedHours: input.estimatedHours ?? 0,
          featured: input.featured ?? false,
          courses: {
            create: courseIds.map((courseId, order) => ({ courseId, order })),
          },
        },
        include: detailInclude,
      });
    });
    return { ok: true, roadmap: toAdminDetail(roadmap), coursesChanged: false };
  } catch (error) {
    if (error instanceof MutationError) {
      return { ok: false, error: error.message, status: error.status };
    }
    if (isUniqueViolation(error)) {
      return { ok: false, error: "That slug is already in use", status: 409 };
    }
    throw error;
  }
}

export async function updateRoadmap(
  organizationId: string,
  roadmapId: string,
  input: RoadmapInput,
): Promise<RoadmapMutationResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.roadmap.findFirst({
        where: { id: roadmapId, organizationId },
        include: { courses: { orderBy: { order: "asc" }, select: { courseId: true } } },
      });
      if (!existing) throw new MutationError("Roadmap not found", 404);

      const data: Prisma.RoadmapUpdateInput = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.thumbnail !== undefined) data.thumbnail = input.thumbnail;
      if (input.category !== undefined) data.category = input.category;
      if (input.level !== undefined) data.level = input.level;
      if (input.status !== undefined) data.status = input.status;
      if (input.outcomes !== undefined) data.outcomes = input.outcomes;
      if (input.estimatedHours !== undefined) data.estimatedHours = input.estimatedHours;
      if (input.featured !== undefined) data.featured = input.featured;

      if (input.slug === "") {
        data.slug = await uniqueSlug(
          tx,
          organizationId,
          input.title ?? existing.title,
          existing.id,
        );
      } else if (input.slug !== undefined && input.slug !== existing.slug) {
        if (await slugTaken(tx, organizationId, input.slug, existing.id)) {
          throw new MutationError(
            `Another roadmap already uses the slug "${input.slug}"`,
            409,
          );
        }
        data.slug = input.slug;
      }

      const finalStatus = input.status ?? existing.status;
      const publishing = input.status === "PUBLISHED" && existing.status !== "PUBLISHED";
      let coursesChanged = false;

      if (input.courseIds !== undefined) {
        const resolved = await resolveCourses(tx, organizationId, input.courseIds);
        if (!resolved.ok) throw new MutationError(resolved.error, 400);

        const before = new Set(existing.courses.map((item) => item.courseId));
        coursesChanged =
          before.size !== input.courseIds.length ||
          input.courseIds.some((id) => !before.has(id));

        // Only guard transitions, so a plain edit of a published roadmap
        // isn't blocked by a course that was unpublished elsewhere.
        if (
          finalStatus === "PUBLISHED" &&
          (publishing || coursesChanged) &&
          !resolved.courses.some((course) => course.status === "PUBLISHED")
        ) {
          throw new MutationError(PUBLISH_NEEDS_COURSE, 400);
        }
        const reordered = existing.courses.some(
          (item, index) => item.courseId !== input.courseIds?.[index],
        );

        if (coursesChanged || reordered) {
          // Rows are replaced wholesale because (roadmapId, order) is unique,
          // which makes in-place reordering collide mid-update.
          await tx.roadmapCourse.deleteMany({ where: { roadmapId: existing.id } });
          if (input.courseIds.length > 0) {
            await tx.roadmapCourse.createMany({
              data: input.courseIds.map((courseId, order) => ({
                roadmapId: existing.id,
                courseId,
                order,
              })),
            });
          }
          data.updatedAt = new Date();
        }
      } else if (publishing) {
        const publishedCount = await tx.roadmapCourse.count({
          where: { roadmapId: existing.id, course: { status: "PUBLISHED" } },
        });
        if (publishedCount === 0) throw new MutationError(PUBLISH_NEEDS_COURSE, 400);
      }

      const roadmap = await tx.roadmap.update({
        where: { id: existing.id },
        data,
        include: detailInclude,
      });
      return { roadmap, coursesChanged };
    });

    return {
      ok: true,
      roadmap: toAdminDetail(result.roadmap),
      coursesChanged: result.coursesChanged,
    };
  } catch (error) {
    if (error instanceof MutationError) {
      return { ok: false, error: error.message, status: error.status };
    }
    if (isUniqueViolation(error)) {
      return { ok: false, error: "That slug is already in use", status: 409 };
    }
    throw error;
  }
}

export async function deleteRoadmap(
  organizationId: string,
  roadmapId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const roadmap = await prisma.roadmap.findFirst({
    where: { id: roadmapId, organizationId },
    select: {
      id: true,
      _count: { select: { enrollments: true, certificates: true } },
    },
  });
  if (!roadmap) return { ok: false, error: "Roadmap not found", status: 404 };

  const { enrollments, certificates } = roadmap._count;
  const blocked = {
    ok: false as const,
    status: 409,
    error: `This roadmap has ${enrollments} enrollment(s) and ${certificates} certificate(s). Archive it instead to hide it from learners while keeping their records.`,
  };
  if (enrollments > 0 || certificates > 0) return blocked;

  // Re-check in the delete itself so a learner enrolling in the meantime
  // isn't cascaded away.
  const deleted = await prisma.roadmap.deleteMany({
    where: {
      id: roadmap.id,
      organizationId,
      enrollments: { none: {} },
      certificates: { none: {} },
    },
  });
  if (deleted.count === 0) {
    return {
      ...blocked,
      error:
        "Learners enrolled in this roadmap while you were deleting it. Archive it instead.",
    };
  }
  return { ok: true };
}

/** Stored enrollment progress goes stale when the course set changes. */
export async function recalculateRoadmapEnrollments(roadmapId: string) {
  const enrollments = await prisma.roadmapEnrollment.findMany({
    where: { roadmapId },
    select: { studentId: true },
  });
  for (const { studentId } of enrollments) {
    try {
      await recalculateRoadmapProgress(studentId, roadmapId);
    } catch (error) {
      console.error(
        `[roadmap-admin] progress recalculation failed for ${studentId} on ${roadmapId}`,
        error,
      );
    }
  }
}
