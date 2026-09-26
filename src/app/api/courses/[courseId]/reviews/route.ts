import { prisma } from "@/lib/db";
import {
  getCourseReviewsBundle,
  hasStudentCompletedCourse,
} from "@/lib/course-reviews";
import {
  cleanString,
  finiteNumber,
  isTeacher,
  jsonError,
  requireSession,
  requireTenantApi,
} from "@/lib/api";
import { readJsonObject } from "@/lib/course-access";
import { resolveLearnerMember } from "@/lib/membership";
import { isOrgAdmin } from "@/lib/tenant";

type Params = { params: Promise<{ courseId: string }> };

async function resolvePublishedCourse(courseId: string, organizationId: string) {
  return prisma.course.findFirst({
    where: {
      organizationId,
      OR: [{ id: courseId }, { slug: courseId }],
      status: "PUBLISHED",
    },
    select: { id: true, title: true },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const { courseId } = await params;
  const session = await requireSession();

  let instructorId: string | undefined;
  if (session && isTeacher(session, tenant.member)) {
    const owned = await prisma.course.findFirst({
      where: {
        organizationId: tenant.organizationId,
        instructorId: session.user.id,
        OR: [{ id: courseId }, { slug: courseId }],
      },
      select: { id: true },
    });
    if (owned) instructorId = session.user.id;
  }

  const bundle = await getCourseReviewsBundle(
    courseId,
    session?.user.id ?? null,
    instructorId ? { instructorId, organizationId: tenant.organizationId } : { organizationId: tenant.organizationId },
  );
  if (!bundle) return jsonError("Course not found", 404);
  return Response.json(bundle);
}

export async function POST(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const learner = await resolveLearnerMember(
    tenant.organizationId,
    session.user,
    tenant.member,
  );
  if (learner?.role !== "STUDENT") {
    return jsonError("Only students can submit course reviews", 403);
  }

  const { courseId } = await params;
  const course = await resolvePublishedCourse(courseId, tenant.organizationId);
  if (!course) return jsonError("Course not found", 404);

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_studentId: {
        courseId: course.id,
        studentId: session.user.id,
      },
    },
  });
  if (!enrollment) {
    return jsonError("Only enrolled students can review this course", 403);
  }

  const completed = await hasStudentCompletedCourse(
    session.user.id,
    course.id,
  );
  if (!completed) {
    return jsonError(
      "Complete every lesson in this course before leaving a review",
      403,
    );
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const rating = Math.round(finiteNumber(body.rating));
  if (rating < 1 || rating > 5) {
    return jsonError("Rating must be between 1 and 5", 400);
  }

  const comment = cleanString(body.comment, 5_000) || null;

  const review = await prisma.review.upsert({
    where: {
      courseId_studentId: {
        courseId: course.id,
        studentId: session.user.id,
      },
    },
    create: {
      courseId: course.id,
      studentId: session.user.id,
      rating,
      comment,
    },
    update: { rating, comment },
    include: {
      student: { select: { id: true, name: true, image: true } },
    },
  });

  const bundle = await getCourseReviewsBundle(course.id, session.user.id, {
    organizationId: tenant.organizationId,
  });

  return Response.json(
    {
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        student: review.student,
      },
      ...bundle,
    },
    { status: 201 },
  );
}

/**
 * Students delete their own review. Org admins can delete any review in the
 * course with ?reviewId= (moderation), whatever the course status.
 */
export async function DELETE(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { courseId } = await params;
  const reviewId = new URL(request.url).searchParams.get("reviewId")?.trim().slice(0, 80);

  if (reviewId) {
    if (session.user.role !== "ADMIN" && !isOrgAdmin(tenant.member)) {
      return jsonError("Admin access required", 403);
    }
    const { count } = await prisma.review.deleteMany({
      where: {
        id: reviewId,
        course: {
          organizationId: tenant.organizationId,
          OR: [{ id: courseId }, { slug: courseId }],
        },
      },
    });
    if (count === 0) return jsonError("Review not found", 404);
    return Response.json({ ok: true, deletedId: reviewId });
  }

  const learner = await resolveLearnerMember(
    tenant.organizationId,
    session.user,
    tenant.member,
  );
  if (learner?.role !== "STUDENT") {
    return jsonError("Forbidden", 403);
  }

  const course = await resolvePublishedCourse(courseId, tenant.organizationId);
  if (!course) return jsonError("Course not found", 404);

  await prisma.review.deleteMany({
    where: {
      courseId: course.id,
      studentId: session.user.id,
    },
  });

  const bundle = await getCourseReviewsBundle(course.id, session.user.id, {
    organizationId: tenant.organizationId,
  });
  return Response.json(bundle);
}
