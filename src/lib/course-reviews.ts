import { prisma } from "@/lib/db";

export type ReviewStudent = {
  id: string;
  name: string;
  image: string | null;
};

export type CourseReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt?: string;
  student: ReviewStudent;
};

export type CourseReviewsBundle = {
  reviews: CourseReviewItem[];
  rating: number;
  reviewCount: number;
  distribution: number[];
  userReview: CourseReviewItem | null;
  canReview: boolean;
  hasCompleted: boolean;
  isEnrolled: boolean;
};

export async function hasStudentCompletedCourse(
  studentId: string,
  courseId: string,
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
    select: { progress: true },
  });
  if (!enrollment) return false;
  if (enrollment.progress >= 100) return true;

  const lessonCount = await prisma.lesson.count({ where: { courseId } });
  if (lessonCount === 0) return false;

  const completedCount = await prisma.lessonProgress.count({
    where: {
      studentId,
      completed: true,
      lesson: { courseId },
    },
  });

  return completedCount >= lessonCount;
}

function mapReview(review: {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  student: { id: string; name: string; image: string | null };
}) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    student: review.student,
  };
}

function buildDistribution(reviews: { rating: number }[]) {
  const counts = [0, 0, 0, 0, 0];
  for (const review of reviews) {
    if (review.rating >= 1 && review.rating <= 5) {
      counts[review.rating - 1] += 1;
    }
  }
  return counts;
}

export async function getCourseReviewsBundle(
  courseId: string,
  studentId?: string | null,
  options?: { instructorId?: string; organizationId?: string },
): Promise<CourseReviewsBundle | null> {
  const course = await prisma.course.findFirst({
    where: options?.instructorId
      ? {
          OR: [{ id: courseId }, { slug: courseId }],
          instructorId: options.instructorId,
          ...(options.organizationId ? { organizationId: options.organizationId } : {}),
        }
      : {
          OR: [{ id: courseId }, { slug: courseId }],
          status: "PUBLISHED",
          ...(options?.organizationId ? { organizationId: options.organizationId } : {}),
        },
    select: { id: true },
  });
  if (!course) return null;

  const reviews = await prisma.review.findMany({
    where: { courseId: course.id },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { id: true, name: true, image: true } },
    },
  });

  const reviewCount = reviews.length;
  const rating =
    reviewCount === 0
      ? 0
      : Math.round(
          (reviews.reduce((sum, item) => sum + item.rating, 0) / reviewCount) *
            10,
        ) / 10;

  let isEnrolled = false;
  let hasCompleted = false;
  let userReview: CourseReviewItem | null = null;

  if (studentId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId: course.id, studentId },
      },
      select: { id: true },
    });
    isEnrolled = Boolean(enrollment);
    hasCompleted = isEnrolled
      ? await hasStudentCompletedCourse(studentId, course.id)
      : false;

    const own = reviews.find((review) => review.studentId === studentId);
    if (own) {
      userReview = mapReview(own);
    }
  }

  const canReview = Boolean(
    studentId && isEnrolled && hasCompleted,
  );

  return {
    reviews: reviews.map(mapReview),
    rating,
    reviewCount,
    distribution: buildDistribution(reviews),
    userReview,
    canReview,
    hasCompleted,
    isEnrolled,
  };
}

/** Newest reviews across the institute, for admin moderation. */
export async function listRecentReviewsForModeration(organizationId: string, take = 100) {
  const reviews = await prisma.review.findMany({
    where: { course: { organizationId } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      course: { select: { id: true, slug: true, title: true } },
      student: {
        select: { id: true, name: true, email: true, image: true, deletedAt: true },
      },
    },
  });

  return reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    course: review.course,
    student: {
      id: review.student.id,
      name: review.student.name,
      // Anonymized accounts keep a placeholder address; don't show it.
      email: review.student.deletedAt ? null : review.student.email,
      image: review.student.image,
      deleted: Boolean(review.student.deletedAt),
    },
  }));
}

export type ModerationReview = Awaited<
  ReturnType<typeof listRecentReviewsForModeration>
>[number];
