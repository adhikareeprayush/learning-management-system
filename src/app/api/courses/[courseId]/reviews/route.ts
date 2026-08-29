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
} from "@/lib/api";

type Params = { params: Promise<{ courseId: string }> };

async function resolvePublishedCourse(courseId: string) {
  return prisma.course.findFirst({
    where: {
      OR: [{ id: courseId }, { slug: courseId }],
      status: "PUBLISHED",
    },
    select: { id: true, title: true },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { courseId } = await params;
  const session = await requireSession();

  let instructorId: string | undefined;
  if (session && isTeacher(session)) {
    const owned = await prisma.course.findFirst({
      where: {
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
    instructorId ? { instructorId } : undefined,
  );
  if (!bundle) return jsonError("Course not found", 404);
  return Response.json(bundle);
}

export async function POST(request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "STUDENT") {
    return jsonError("Only students can submit course reviews", 403);
  }

  const { courseId } = await params;
  const course = await resolvePublishedCourse(courseId);
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

  const body = await request.json();
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

  const bundle = await getCourseReviewsBundle(course.id, session.user.id);

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

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "STUDENT") {
    return jsonError("Forbidden", 403);
  }

  const { courseId } = await params;
  const course = await resolvePublishedCourse(courseId);
  if (!course) return jsonError("Course not found", 404);

  await prisma.review.deleteMany({
    where: {
      courseId: course.id,
      studentId: session.user.id,
    },
  });

  const bundle = await getCourseReviewsBundle(course.id, session.user.id);
  return Response.json(bundle);
}
