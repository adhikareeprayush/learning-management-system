import type { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notifyCertificateIssued } from "@/lib/email-notifications";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { enrollUserInCourse } from "@/lib/enrollments";

export { formatLevel } from "@/lib/format";

export type RoadmapCourseProgress = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  level: string;
  thumbnail: string | null;
  duration: number;
  price: number;
  priceNpr: number;
  instructorName: string;
  order: number;
  enrolled: boolean;
  progress: number;
  completed: boolean;
  hasCertificate: boolean;
};

export type RoadmapDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string;
  category: string | null;
  level: string;
  outcomes: string[];
  estimatedHours: number;
  featured: boolean;
  courseCount: number;
  courses: RoadmapCourseProgress[];
  enrolled: boolean;
  progress: number;
  completedCount: number;
  hasCertificate: boolean;
  certificateId: string | null;
};

/**
 * A course counts as done on a path only once its certificate is issued, so
 * the path certificate carries the same bar (all lessons and quizzes).
 */
async function certifiedCourseIds(studentId: string, courseIds: string[]) {
  if (courseIds.length === 0) return new Set<string>();
  const certs = await prisma.certificate.findMany({
    where: { studentId, courseId: { in: courseIds } },
    select: { courseId: true },
  });
  return new Set(certs.map((c) => c.courseId));
}

export async function maybeIssueRoadmapCertificate(
  studentId: string,
  roadmapId: string,
) {
  const items = await prisma.roadmapCourse.findMany({
    where: {
      roadmapId,
      course: { status: "PUBLISHED" },
    },
    select: { courseId: true },
  });
  if (items.length === 0) return null;

  const courseIds = items.map((item) => item.courseId);
  const certSet = await certifiedCourseIds(studentId, courseIds);
  if (!courseIds.every((id) => certSet.has(id))) return null;

  const existing = await prisma.roadmapCertificate.findUnique({
    where: {
      studentId_roadmapId: { studentId, roadmapId },
    },
  });
  if (existing) return existing;

  const [student, roadmap] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }),
    prisma.roadmap.findUnique({ where: { id: roadmapId }, select: { title: true } }),
  ]);
  if (!student || !roadmap) return null;

  try {
    const certificate = await prisma.roadmapCertificate.create({
      data: {
        studentId,
        roadmapId,
        issuedAt: new Date(),
        // Snapshot: later renames or course changes must not rewrite it.
        holderName: student.name,
        roadmapTitle: roadmap.title,
        courseCount: courseIds.length,
      },
    });
    notifyCertificateIssued({ kind: "roadmap", certificateId: certificate.id });
    return certificate;
  } catch (error) {
    // Concurrent sync / multi-course completion can race on create.
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      return prisma.roadmapCertificate.findUnique({
        where: {
          studentId_roadmapId: { studentId, roadmapId },
        },
      });
    }
    throw error;
  }
}

export async function listPublishedRoadmaps(
  organizationId: string,
  studentId?: string | null,
) {
  const roadmaps = await prisma.roadmap.findMany({
    where: { organizationId, status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { title: "asc" }],
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: {
            select: {
              id: true,
              duration: true,
              price: true,
              status: true,
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  let enrollmentMap = new Map<string, number>();
  let certSet = new Set<string>();

  if (studentId) {
    const [enrollments, certs] = await Promise.all([
      prisma.roadmapEnrollment.findMany({
        where: { studentId },
        select: { roadmapId: true, progress: true },
      }),
      prisma.roadmapCertificate.findMany({
        where: { studentId },
        select: { roadmapId: true },
      }),
    ]);
    enrollmentMap = new Map(enrollments.map((e) => [e.roadmapId, e.progress]));
    certSet = new Set(certs.map((c) => c.roadmapId));
  }

  return roadmaps.map((roadmap) => {
    const publishedCourses = roadmap.courses.filter(
      (item) => item.course.status === "PUBLISHED",
    );
    return {
      id: roadmap.id,
      slug: roadmap.slug,
      title: roadmap.title,
      description: roadmap.description,
      thumbnail: resolveMediaUrl(roadmap.thumbnail),
      category: roadmap.category,
      level: roadmap.level,
      estimatedHours: roadmap.estimatedHours,
      featured: roadmap.featured,
      courseCount: publishedCourses.length,
      learnerCount: roadmap._count.enrollments,
      enrolled: enrollmentMap.has(roadmap.id),
      progress: enrollmentMap.get(roadmap.id) ?? 0,
      hasCertificate: certSet.has(roadmap.id),
    };
  });
}

export async function getRoadmapDetail(
  organizationId: string,
  slugOrId: string,
  studentId?: string | null,
): Promise<RoadmapDetail | null> {
  const roadmap = await prisma.roadmap.findFirst({
    where: {
      organizationId,
      status: "PUBLISHED",
      OR: [{ slug: slugOrId }, { id: slugOrId }],
    },
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: {
            include: {
              instructor: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!roadmap) return null;

  const published = roadmap.courses.filter(
    (item) => item.course.status === "PUBLISHED",
  );
  const courseIds = published.map((item) => item.course.id);

  let enrollmentProgress = new Map<string, number>();
  let certificateCourseIds = new Set<string>();
  let roadmapEnrollment: { progress: number } | null = null;
  let roadmapCertId: string | null = null;

  if (studentId) {
    const [courseEnrollments, courseCerts, rmEnrollment, rmCert] =
      await Promise.all([
        courseIds.length
          ? prisma.enrollment.findMany({
              where: { studentId, courseId: { in: courseIds } },
              select: { courseId: true, progress: true },
            })
          : Promise.resolve([]),
        courseIds.length
          ? prisma.certificate.findMany({
              where: { studentId, courseId: { in: courseIds } },
              select: { courseId: true },
            })
          : Promise.resolve([]),
        prisma.roadmapEnrollment.findUnique({
          where: {
            roadmapId_studentId: {
              roadmapId: roadmap.id,
              studentId,
            },
          },
          select: { progress: true },
        }),
        prisma.roadmapCertificate.findUnique({
          where: {
            studentId_roadmapId: {
              studentId,
              roadmapId: roadmap.id,
            },
          },
          select: { id: true },
        }),
      ]);

    enrollmentProgress = new Map(
      courseEnrollments.map((e) => [e.courseId, e.progress]),
    );
    certificateCourseIds = new Set(courseCerts.map((c) => c.courseId));
    roadmapEnrollment = rmEnrollment;
    roadmapCertId = rmCert?.id ?? null;
  }

  const courses: RoadmapCourseProgress[] = published.map((item) => {
    const progress = enrollmentProgress.get(item.course.id) ?? 0;
    const hasCertificate = certificateCourseIds.has(item.course.id);
    return {
      id: item.course.id,
      slug: item.course.slug,
      title: item.course.title,
      category: item.course.category,
      level: item.course.level,
      thumbnail: item.course.thumbnail,
      duration: item.course.duration,
      price: item.course.price,
      priceNpr: item.course.priceNpr,
      instructorName: item.course.instructor.name,
      order: item.order,
      enrolled: enrollmentProgress.has(item.course.id),
      progress,
      completed: hasCertificate,
      hasCertificate,
    };
  });

  const completedCount = courses.filter((c) => c.completed).length;
  const progress =
    courses.length === 0
      ? 0
      : Math.round((completedCount / courses.length) * 100);

  return {
    id: roadmap.id,
    slug: roadmap.slug,
    title: roadmap.title,
    description: roadmap.description,
    thumbnail: resolveMediaUrl(roadmap.thumbnail),
    category: roadmap.category,
    level: roadmap.level,
    outcomes: roadmap.outcomes,
    estimatedHours: roadmap.estimatedHours,
    featured: roadmap.featured,
    courseCount: courses.length,
    courses,
    enrolled: Boolean(roadmapEnrollment),
    progress: roadmapEnrollment?.progress ?? progress,
    completedCount,
    hasCertificate: Boolean(roadmapCertId),
    certificateId: roadmapCertId,
  };
}

export async function recalculateRoadmapProgress(
  studentId: string,
  roadmapId: string,
) {
  const items = await prisma.roadmapCourse.findMany({
    where: {
      roadmapId,
      course: { status: "PUBLISHED" },
    },
    select: { courseId: true },
  });
  if (items.length === 0) return 0;

  const courseIds = items.map((item) => item.courseId);
  const certSet = await certifiedCourseIds(studentId, courseIds);
  const completed = courseIds.filter((id) => certSet.has(id)).length;

  const progress = Math.round((completed / courseIds.length) * 100);

  await prisma.roadmapEnrollment.updateMany({
    where: { roadmapId, studentId, progress: { not: progress } },
    data: { progress },
  });

  if (progress >= 100) {
    await maybeIssueRoadmapCertificate(studentId, roadmapId);
  }

  return progress;
}

export async function recalculateRoadmapsForCourse(
  studentId: string,
  courseId: string,
) {
  const links = await prisma.roadmapCourse.findMany({
    where: { courseId },
    select: { roadmapId: true },
  });

  for (const link of links) {
    await recalculateRoadmapProgress(studentId, link.roadmapId);
  }
}

export type RoadmapCourseEnrollStatus =
  | "enrolled"
  | "already_enrolled"
  | "payment_required"
  | "failed";

export type RoadmapCourseEnrollResult = {
  courseId: string;
  slug: string;
  title: string;
  status: RoadmapCourseEnrollStatus;
  error?: string;
};

export type EnrollRoadmapResult =
  | {
      ok: true;
      roadmapSlug: string;
      roleChanged: false;
      alreadyEnrolled: boolean;
      /** Courses newly enrolled by this request. */
      coursesEnrolled: number;
      /** Courses the student is enrolled in after this request. */
      enrolledCount: number;
      /** Paid courses that still need a purchase. */
      paymentRequiredCount: number;
      courses: RoadmapCourseEnrollResult[];
    }
  | { ok: false; error: string; status: number };

/**
 * Enrolls the user in the roadmap and every free (or already purchased)
 * course on it. Paid courses are reported back as `payment_required` so the
 * UI can send the learner to checkout; the user's org role is never changed.
 */
export async function enrollUserInRoadmap(
  userId: string,
  orgRole: OrgRole | string | null,
  roadmapId: string,
  organizationId: string,
): Promise<EnrollRoadmapResult> {
  const roadmap = await prisma.roadmap.findFirst({
    where: { id: roadmapId, organizationId, status: "PUBLISHED" },
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: {
            select: { id: true, slug: true, title: true, status: true },
          },
        },
      },
    },
  });

  if (!roadmap) {
    return { ok: false, error: "Roadmap not found", status: 404 };
  }

  const publishedCourses = roadmap.courses.filter(
    (item) => item.course.status === "PUBLISHED",
  );
  if (publishedCourses.length === 0) {
    return {
      ok: false,
      error: "This roadmap has no published courses yet",
      status: 400,
    };
  }

  const existing = await prisma.roadmapEnrollment.findUnique({
    where: {
      roadmapId_studentId: { roadmapId: roadmap.id, studentId: userId },
    },
  });

  if (!existing) {
    try {
      await prisma.roadmapEnrollment.create({
        data: { roadmapId: roadmap.id, studentId: userId },
      });
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (code !== "P2002") throw error;
    }
  }

  const courses: RoadmapCourseEnrollResult[] = [];
  for (const item of publishedCourses) {
    const result = await enrollUserInCourse(
      userId,
      orgRole,
      item.course.id,
      organizationId,
    );
    const base = {
      courseId: item.course.id,
      slug: item.course.slug,
      title: item.course.title,
    };
    if (result.ok) {
      courses.push({
        ...base,
        status: result.alreadyEnrolled ? "already_enrolled" : "enrolled",
      });
    } else {
      courses.push({
        ...base,
        status: result.status === 402 ? "payment_required" : "failed",
        error: result.error,
      });
    }
  }

  await recalculateRoadmapProgress(userId, roadmap.id);

  return {
    ok: true,
    roadmapSlug: roadmap.slug,
    roleChanged: false,
    alreadyEnrolled: Boolean(existing),
    coursesEnrolled: courses.filter((c) => c.status === "enrolled").length,
    enrolledCount: courses.filter(
      (c) => c.status === "enrolled" || c.status === "already_enrolled",
    ).length,
    paymentRequiredCount: courses.filter((c) => c.status === "payment_required")
      .length,
    courses,
  };
}
