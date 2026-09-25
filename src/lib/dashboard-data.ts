import type { PaymentStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { formatCoursePrice } from "@/lib/pricing";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function lastMonths(count: number) {
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    months.push({
      label: MONTH_LABELS[d.getMonth()]!,
      start: d,
      end,
    });
  }
  return months;
}

function formatDue(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function priorityFromDue(due: Date) {
  const days = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days <= 2) return "high" as const;
  if (days <= 7) return "medium" as const;
  return "low" as const;
}

type DayBucket = {
  label: string;
  start: Date;
  end: Date;
};

function rollingWeekBuckets(now = new Date()): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const start = new Date(now);
    start.setDate(now.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    buckets.push({
      label: start.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      start,
      end,
    });
  }
  return buckets;
}

function aggregateHoursByDay(
  entries: { at: Date; minutes: number }[],
  buckets: DayBucket[],
) {
  const totals = buckets.map(() => 0);
  for (const entry of entries) {
    const index = buckets.findIndex(
      (bucket) => entry.at >= bucket.start && entry.at <= bucket.end,
    );
    if (index < 0) continue;
    totals[index] += entry.minutes / 60;
  }
  return totals.map((hours) => Math.round(hours * 10) / 10);
}

function countDistinctByDay(
  entries: { at: Date; key: string }[],
  buckets: DayBucket[],
) {
  return buckets.map((bucket) => {
    const keys = new Set(
      entries
        .filter((entry) => entry.at >= bucket.start && entry.at <= bucket.end)
        .map((entry) => entry.key),
    );
    return keys.size;
  });
}

function computeStreakDays(completionDates: Date[], now = new Date()) {
  if (completionDates.length === 0) return 0;
  const dayKeys = new Set(
    completionDates.map((date) => {
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      return day.getTime();
    }),
  );
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  // Nothing done yet today doesn't break the streak until the day is over.
  if (!dayKeys.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dayKeys.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getStudentDashboardData(
  studentId: string,
  organizationId: string,
) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, course: { organizationId } },
    include: {
      course: {
        include: {
          instructor: { select: { name: true } },
          lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, duration: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const lessonIds = enrollments.flatMap((e) => e.course.lessons.map((l) => l.id));
  const completedRows = lessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: { studentId, lessonId: { in: lessonIds }, completed: true },
        select: { lessonId: true, completedAt: true },
      })
    : [];

  const completedLessonIds = new Set(completedRows.map((r) => r.lessonId));

  const continueLearning = enrollments
    .map((enrollment) => {
      const lessons = enrollment.course.lessons;
      const total = lessons.length;
      const completed = lessons.filter((l) => completedLessonIds.has(l.id)).length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        id: enrollment.course.id,
        slug: enrollment.course.slug,
        title: enrollment.course.title,
        category: enrollment.course.category ?? "Course",
        image: resolveMediaUrl(enrollment.course.thumbnail),
        instructor: enrollment.course.instructor.name,
        progress,
      };
    })
    .filter((c) => c.progress < 100)
    .slice(0, 4);

  const completedCourses = enrollments.filter((e) => {
    const total = e.course.lessons.length;
    if (total === 0) return false;
    const done = e.course.lessons.filter((l) => completedLessonIds.has(l.id)).length;
    return done >= total;
  }).length;

  const hoursLearned = completedRows.reduce((sum, row) => {
    const lesson = enrollments
      .flatMap((e) => e.course.lessons)
      .find((l) => l.id === row.lessonId);
    return sum + (lesson?.duration ?? 0);
  }, 0) / 60;

  const courseIds = enrollments.map((e) => e.course.id);
  // No `take` here: submitted assignments are filtered out below, so limiting
  // first would undercount what's still due.
  const assignments = courseIds.length
    ? await prisma.assignment.findMany({
        where: { courseId: { in: courseIds }, dueDate: { gte: new Date() } },
        include: { course: { select: { title: true } } },
        orderBy: { dueDate: "asc" },
      })
    : [];

  const submissions = courseIds.length
    ? await prisma.submission.findMany({
        where: { studentId, assignment: { courseId: { in: courseIds } } },
        select: { assignmentId: true, status: true, submittedAt: true },
      })
    : [];

  const submittedIds = new Set(
    submissions.filter((s) => s.status !== "PENDING").map((s) => s.assignmentId),
  );

  const outstandingAssignments = assignments.filter(
    (a) => a.dueDate && !submittedIds.has(a.id),
  );
  const dueCount = outstandingAssignments.length;

  const upcomingDeadlines = outstandingAssignments.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.title,
    course: a.course.title,
    due: formatDue(a.dueDate!),
    priority: priorityFromDue(a.dueDate!),
  }));

  const recentProgress = await prisma.lessonProgress.findMany({
    where: { studentId, completed: true },
    orderBy: { completedAt: "desc" },
    take: 5,
    include: { lesson: { select: { title: true } } },
  });

  const activityFeed = recentProgress.map((row) => ({
    id: row.id,
    text: `Completed “${row.lesson.title}”`,
    time: row.completedAt
      ? row.completedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Recently",
  }));

  const categoryProgress = new Map<string, { total: number; done: number }>();
  for (const enrollment of enrollments) {
    const cat = enrollment.course.category ?? "Other";
    const entry = categoryProgress.get(cat) ?? { total: 0, done: 0 };
    for (const lesson of enrollment.course.lessons) {
      entry.total += 1;
      if (completedLessonIds.has(lesson.id)) entry.done += 1;
    }
    categoryProgress.set(cat, entry);
  }

  const completionByCategory = {
    labels: [...categoryProgress.keys()].slice(0, 5),
    series: [...categoryProgress.values()]
      .slice(0, 5)
      .map((v) => (v.total === 0 ? 0 : Math.round((v.done / v.total) * 100))),
  };

  const months = lastMonths(6);
  const monthlyProgress = {
    categories: months.map((m) => m.label),
    series: [
      {
        name: "Lessons done",
        data: months.map(
          (m) =>
            completedRows.filter(
              (r) =>
                r.completedAt &&
                r.completedAt >= m.start &&
                r.completedAt <= m.end,
            ).length,
        ),
      },
      {
        name: "Assignments",
        data: months.map(
          (m) =>
            submissions.filter(
              (row) =>
                row.status !== "PENDING" &&
                row.submittedAt >= m.start &&
                row.submittedAt <= m.end,
            ).length,
        ),
      },
    ],
  };

  const dayBuckets = rollingWeekBuckets();
  const weekStart = dayBuckets[0]!.start;

  const lessonDurationById = new Map(
    enrollments
      .flatMap((enrollment) => enrollment.course.lessons)
      .map((lesson) => [lesson.id, lesson.duration] as const),
  );

  const weeklyEntries = completedRows
    .filter((row) => row.completedAt && row.completedAt >= weekStart)
    .map((row) => ({
      at: row.completedAt!,
      minutes: lessonDurationById.get(row.lessonId) ?? 0,
    }));

  const weeklyLearningHours = {
    categories: dayBuckets.map((bucket) => bucket.label),
    series: [
      {
        name: "Hours",
        data: aggregateHoursByDay(weeklyEntries, dayBuckets),
      },
    ],
  };

  return {
    stats: [
      {
        id: "enrolled",
        label: "Enrolled",
        value: String(enrollments.length),
        delta: `${enrollments.length} active`,
        tone: "purple" as const,
      },
      {
        id: "completed",
        label: "Completed",
        value: String(completedCourses),
        delta: completedCourses > 0 ? "Keep going" : "Start learning",
        tone: "teal" as const,
      },
      {
        id: "hours",
        label: "Hours learned",
        value: hoursLearned.toFixed(1),
        delta: "From completed lessons",
        tone: "navy" as const,
      },
      {
        id: "due",
        label: "Assignments due",
        value: String(dueCount),
        delta: dueCount > 0 ? "Upcoming" : "All caught up",
        tone: "mint" as const,
      },
    ],
    continueLearning,
    upcomingDeadlines,
    activityFeed,
    completionByCategory,
    monthlyProgress,
    weeklyLearningHours,
    skillRadar: {
      categories: completionByCategory.labels,
      series: [{ name: "Category progress", data: completionByCategory.series }],
    },
    streakDays: computeStreakDays(
      completedRows
        .map((row) => row.completedAt)
        .filter((date): date is Date => date instanceof Date),
    ),
  };
}

export async function getInstructorDashboardData(
  instructorId: string,
  organizationId: string,
) {
  const courses = await prisma.course.findMany({
    where: { instructorId, organizationId },
    include: {
      _count: { select: { enrollments: true, lessons: true, reviews: true } },
      enrollments: {
        select: { progress: true, enrolledAt: true },
        orderBy: { enrolledAt: "desc" },
      },
      reviews: { select: { rating: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const courseIds = courses.map((c) => c.id);
  const totalStudents = courses.reduce((sum, c) => sum + c._count.enrollments, 0);
  const published = courses.filter((c) => c.status === "PUBLISHED").length;

  const allRatings = courses.flatMap((course) => course.reviews.map((r) => r.rating));
  const avgRating =
    allRatings.length === 0
      ? null
      : Math.round(
          (allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length) *
            10,
        ) / 10;

  const recentStudents = await prisma.enrollment.findMany({
    where: courseIds.length ? { courseId: { in: courseIds } } : { courseId: "none" },
    orderBy: { enrolledAt: "desc" },
    take: 6,
    include: {
      student: { select: { id: true, name: true } },
      course: { select: { title: true, slug: true } },
    },
  });

  const months = lastMonths(6);
  // Single query for the whole window, then bucket in JS (avoids one COUNT per month).
  const trendRows = courseIds.length
    ? await prisma.enrollment.findMany({
        where: {
          courseId: { in: courseIds },
          enrolledAt: { gte: months[0].start, lte: months[months.length - 1].end },
        },
        select: { enrolledAt: true },
      })
    : [];
  const enrollmentTrend = {
    categories: months.map((m) => m.label),
    series: [
      {
        name: "Enrollments",
        data: months.map(
          (m) =>
            trendRows.filter(
              (r) => r.enrolledAt >= m.start && r.enrolledAt <= m.end,
            ).length,
        ),
      },
    ],
  };

  const revenueRows = courseIds.length
    ? await prisma.payment.groupBy({
        by: ["courseId"],
        where: { courseId: { in: courseIds }, status: "COMPLETED" },
        _sum: { amount: true },
      })
    : [];
  const titleById = new Map(courses.map((c) => [c.id, c.title]));
  const revenueByCourse = revenueRows
    .map((row) => ({
      title: titleById.get(row.courseId) ?? "Course",
      amountPaisa: row._sum.amount ?? 0,
    }))
    .filter((row) => row.amountPaisa > 0)
    .sort((a, b) => b.amountPaisa - a.amountPaisa);
  const topRevenue = revenueByCourse.slice(0, 4);
  const otherRevenue = revenueByCourse
    .slice(4)
    .reduce((sum, row) => sum + row.amountPaisa, 0);

  const instructorCourses = courses.slice(0, 4).map((c) => {
    const avgProgress =
      c.enrollments.length === 0
        ? 0
        : Math.round(
            c.enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) /
              c.enrollments.length,
          );
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      students: c._count.enrollments,
      lessons: c._count.lessons,
      status: c.status,
      image: resolveMediaUrl(c.thumbnail),
      progress: avgProgress,
    };
  });

  return {
    stats: [
      {
        id: "courses",
        label: "Courses",
        value: String(courses.length),
        delta: `${published} published`,
        tone: "purple" as const,
      },
      {
        id: "students",
        label: "Students",
        value: String(totalStudents),
        delta: "Total enrollments",
        tone: "teal" as const,
      },
      {
        id: "lessons",
        label: "Lessons",
        value: String(courses.reduce((s, c) => s + c._count.lessons, 0)),
        delta: "Across all courses",
        tone: "navy" as const,
      },
      {
        id: "reviews",
        label: "Avg rating",
        value: avgRating !== null ? String(avgRating) : "—",
        delta:
          allRatings.length > 0
            ? `${allRatings.length} review${allRatings.length === 1 ? "" : "s"}`
            : "No reviews yet",
        tone: "mint" as const,
      },
    ],
    instructorCourses,
    recentStudents: recentStudents.map((e) => ({
      id: e.student.id,
      name: e.student.name,
      course: e.course.title,
      courseSlug: e.course.slug,
      enrolled: e.enrolledAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })),
    enrollmentTrend,
    /** Completed payments only; amounts are NPR paisa. */
    revenueMix: {
      labels: [
        ...topRevenue.map((row) => row.title),
        ...(otherRevenue > 0 ? ["Other courses"] : []),
      ],
      series: [
        ...topRevenue.map((row) => row.amountPaisa),
        ...(otherRevenue > 0 ? [otherRevenue] : []),
      ],
      totalPaisa: revenueByCourse.reduce((sum, row) => sum + row.amountPaisa, 0),
    },
    instructorActivity: recentStudents.slice(0, 4).map((e) => ({
      id: e.id,
      text: `${e.student.name} enrolled in ${e.course.title}`,
      time: e.enrolledAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })),
  };
}

type RoleKey = Role;
const ROLE_LABELS: Record<RoleKey, string> = {
  STUDENT: "Student",
  INSTRUCTOR: "Instructor",
  ADMIN: "Admin",
};

/**
 * Accounts by User.role — the same field the admin Users page filters on, so
 * dashboard numbers match what the linked lists show.
 */
async function countUsersByRole(where: Prisma.UserWhereInput = {}) {
  const rows = await prisma.user.groupBy({
    by: ["role"],
    where,
    _count: { _all: true },
  });
  const counts: Record<RoleKey, number> = { STUDENT: 0, INSTRUCTOR: 0, ADMIN: 0 };
  for (const row of rows) counts[row.role] = row._count._all;
  return counts;
}

export async function getAdminDashboardData(organizationId: string) {
  const orgCourseFilter = { organizationId };
  const orgEnrollmentFilter = { course: { organizationId } };

  const months = lastMonths(6);
  const windowStart = months[0]!.start;

  const [roleCounts, courseCount, enrollmentCount, inReviewCount, baseline, windowUsers] =
    await Promise.all([
      countUsersByRole(),
      prisma.course.count({ where: orgCourseFilter }),
      prisma.enrollment.count({ where: orgEnrollmentFilter }),
      prisma.course.count({ where: { organizationId, status: "IN_REVIEW" } }),
      countUsersByRole({ createdAt: { lt: windowStart } }),
      prisma.user.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { role: true, createdAt: true },
      }),
    ]);

  const students = roleCounts.STUDENT;
  const instructors = roleCounts.INSTRUCTOR;
  const admins = roleCounts.ADMIN;
  const userCount = students + instructors + admins;

  const cumulative = (role: RoleKey, end: Date) =>
    baseline[role] +
    windowUsers.filter((user) => user.role === role && user.createdAt <= end).length;

  const platformGrowth = {
    categories: months.map((m) => m.label),
    series: [
      { name: "Students", data: months.map((m) => cumulative("STUDENT", m.end)) },
      { name: "Instructors", data: months.map((m) => cumulative("INSTRUCTOR", m.end)) },
    ],
  };

  const engagementBuckets = rollingWeekBuckets();
  const engagementWeekStart = engagementBuckets[0]!.start;
  const weeklyActivity = await prisma.lessonProgress.findMany({
    where: {
      completed: true,
      completedAt: { gte: engagementWeekStart },
      lesson: { course: { organizationId } },
    },
    select: { studentId: true, completedAt: true },
  });

  const engagementWeekly = {
    categories: engagementBuckets.map((bucket) => bucket.label),
    series: [
      {
        name: "Active learners",
        data: countDistinctByDay(
          weeklyActivity
            .filter((row) => row.completedAt)
            .map((row) => ({
              at: row.completedAt!,
              key: row.studentId,
            })),
          engagementBuckets,
        ),
      },
    ],
  };

  const moderationQueue = await prisma.course.findMany({
    where: { organizationId, status: "IN_REVIEW" },
    take: 5,
    include: { instructor: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, role: true, createdAt: true },
  });

  return {
    stats: [
      {
        id: "users",
        label: "Total users",
        value: String(userCount),
        delta: `${students} students · ${admins} admin${admins === 1 ? "" : "s"}`,
        tone: "purple" as const,
      },
      {
        id: "courses",
        label: "Courses",
        value: String(courseCount),
        delta: `${inReviewCount} in review`,
        tone: "teal" as const,
      },
      {
        id: "enrolled",
        label: "Enrollments",
        value: String(enrollmentCount),
        delta: "All time",
        tone: "navy" as const,
      },
      {
        id: "instructors",
        label: "Instructors",
        value: String(instructors),
        delta: "Instructor accounts",
        tone: "mint" as const,
      },
    ],
    platformGrowth,
    roleDistribution: {
      labels: ["Students", "Instructors", "Admins"],
      series: [students, instructors, admins],
    },
    moderationQueue: moderationQueue.map((c) => ({
      id: c.id,
      title: c.title,
      instructor: c.instructor.name,
      status: c.status,
      submitted: c.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })),
    adminActivity: recentUsers.map((user) => ({
      id: user.id,
      text: `${user.name} signed up · ${ROLE_LABELS[user.role]}`,
      time: user.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })),
    engagementWeekly,
  };
}

export async function getInstructorsFromDb(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      role: { in: ["INSTRUCTOR", "ORG_ADMIN"] },
    },
    include: {
      user: {
        include: {
          courseTeaching: {
            where: { organizationId, status: "PUBLISHED" },
            take: 3,
            select: { id: true, title: true, slug: true, thumbnail: true, category: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return members.map((m) => ({
    ...m.user,
    _count: {
      courseTeaching: m.user.courseTeaching.length,
    },
  }));
}

export async function getInstructorProfile(instructorId: string, organizationId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId: instructorId,
      role: { in: ["INSTRUCTOR", "ORG_ADMIN"] },
    },
  });
  if (!member) return null;

  return prisma.user.findFirst({
    where: { id: instructorId },
    include: {
      courseTeaching: {
        where: { organizationId, status: "PUBLISHED" },
        include: { _count: { select: { enrollments: true, reviews: true } } },
      },
      _count: {
        select: {
          courseTeaching: true,
        },
      },
    },
  });
}

export type ReportPeriodKey = "7d" | "30d" | "6m";

function periodRange(key: ReportPeriodKey) {
  const end = new Date();
  const start = new Date(end);
  if (key === "7d") {
    start.setDate(end.getDate() - 6);
  } else if (key === "30d") {
    start.setDate(end.getDate() - 29);
  } else {
    start.setMonth(end.getMonth() - 5);
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function periodBuckets(key: ReportPeriodKey) {
  const { start, end } = periodRange(key);
  if (key === "7d") {
    return rollingWeekBuckets();
  }
  if (key === "30d") {
    const buckets: { label: string; start: Date; end: Date }[] = [];
    for (let i = 0; i < 4; i += 1) {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + i * 7);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 7);
      bucketEnd.setTime(bucketEnd.getTime() - 1);
      // 30 days don't split evenly into weeks; the last bucket takes the remainder.
      if (i === 3 || bucketEnd > end) bucketEnd.setTime(end.getTime());
      buckets.push({
        label: `W${i + 1}`,
        start: bucketStart,
        end: bucketEnd,
      });
    }
    return buckets;
  }
  return lastMonths(6);
}

function formatCourseDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

function formatStudentCount(count: number) {
  return `${count.toLocaleString()} Student${count === 1 ? "" : "s"}`;
}

export async function getFeaturedCoursesForHome(organizationId: string) {
  const baseInclude = {
    _count: { select: { enrollments: true } },
    reviews: { select: { rating: true } },
  } as const;

  let courses = await prisma.course.findMany({
    where: { organizationId, status: "PUBLISHED", featured: true },
    take: 6,
    orderBy: { createdAt: "desc" },
    include: baseInclude,
  });

  if (courses.length === 0) {
    courses = await prisma.course.findMany({
      where: { organizationId, status: "PUBLISHED" },
      take: 6,
      orderBy: { enrollments: { _count: "desc" } },
      include: baseInclude,
    });
  }

  return courses.map((course) => {
    // 0 = no reviews yet; CourseCard hides the stars rather than faking 5.
    const avgRating =
      course.reviews.length === 0
        ? 0
        : Math.round(
            (course.reviews.reduce((sum, r) => sum + r.rating, 0) /
              course.reviews.length) *
              10,
          ) / 10;
    return {
      id: course.slug,
      title: course.title,
      image: resolveMediaUrl(course.thumbnail),
      students: formatStudentCount(course._count.enrollments),
      duration: formatCourseDuration(course.duration),
      price: formatCoursePrice(course),
      category: course.category ?? undefined,
      date: course.createdAt.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }),
      rating: avgRating,
      reviewCount: course.reviews.length,
    };
  });
}

export async function getInstructorAnalyticsData(
  instructorId: string,
  organizationId: string,
) {
  const courses = await prisma.course.findMany({
    where: { instructorId, organizationId, status: "PUBLISHED" },
    include: {
      _count: { select: { enrollments: true } },
      lessons: { select: { id: true, duration: true } },
      enrollments: { select: { progress: true } },
    },
  });

  const courseIds = courses.map((c) => c.id);
  const lessonIds = courses.flatMap((c) => c.lessons.map((l) => l.id));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [newEnrollments, completedProgress] = await Promise.all([
    courseIds.length
      ? prisma.enrollment.count({
          where: {
            courseId: { in: courseIds },
            enrolledAt: { gte: monthStart },
          },
        })
      : Promise.resolve(0),
    lessonIds.length
      ? prisma.lessonProgress.findMany({
          where: {
            lessonId: { in: lessonIds },
            completed: true,
            completedAt: { not: null },
          },
          include: { lesson: { select: { duration: true } } },
        })
      : Promise.resolve([]),
  ]);

  const totalWatchMinutes = completedProgress.reduce(
    (sum, row) => sum + row.lesson.duration,
    0,
  );
  const watchHours = Math.round((totalWatchMinutes / 60) * 10) / 10;

  const avgCompletion =
    courses.length === 0
      ? 0
      : Math.round(
          courses.reduce((sum, course) => {
            const courseAvg =
              course.enrollments.length === 0
                ? 0
                : course.enrollments.reduce((s, e) => s + e.progress, 0) /
                  course.enrollments.length;
            return sum + courseAvg;
          }, 0) / courses.length,
        );

  const weekBuckets = rollingWeekBuckets(now);
  const weekStart = weekBuckets[0]!.start;

  const weekProgress = lessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: {
          lessonId: { in: lessonIds },
          completed: true,
          completedAt: { gte: weekStart },
        },
        include: { lesson: { select: { duration: true } } },
      })
    : [];

  const weeklyWatchEntries = weekProgress
    .filter((row) => row.completedAt)
    .map((row) => ({
      at: row.completedAt!,
      minutes: row.lesson.duration,
    }));

  const watchTimeWeekly = {
    categories: weekBuckets.map((bucket) => bucket.label),
    series: [
      {
        name: "Hours watched",
        data: aggregateHoursByDay(weeklyWatchEntries, weekBuckets),
      },
    ],
  };

  const completionByCourse = {
    labels: courses.slice(0, 4).map((c) =>
      c.title.length > 22 ? `${c.title.slice(0, 22)}…` : c.title,
    ),
    series: courses.slice(0, 4).map((course) => {
      if (course.enrollments.length === 0) return 0;
      return Math.round(
        course.enrollments.reduce((s, e) => s + e.progress, 0) /
          course.enrollments.length,
      );
    }),
  };

  const months = lastMonths(6);
  // Single query for the whole window, then bucket in JS (avoids one COUNT per month).
  const trendRows = courseIds.length
    ? await prisma.enrollment.findMany({
        where: {
          courseId: { in: courseIds },
          enrolledAt: { gte: months[0].start, lte: months[months.length - 1].end },
        },
        select: { enrolledAt: true },
      })
    : [];
  const enrollmentTrend = {
    categories: months.map((m) => m.label),
    series: [
      {
        name: "Enrollments",
        data: months.map(
          (m) =>
            trendRows.filter(
              (r) => r.enrolledAt >= m.start && r.enrolledAt <= m.end,
            ).length,
        ),
      },
    ],
  };

  return {
    stats: [
      {
        id: "hours",
        label: "Watch time",
        value: `${watchHours}h`,
        hint: "From completed lessons",
        tone: "navy" as const,
      },
      {
        id: "completed",
        label: "Completion rate",
        value: `${avgCompletion}%`,
        hint: "Across published courses",
        tone: "teal" as const,
      },
      {
        id: "enrolled",
        label: "New enrollments",
        value: String(newEnrollments),
        hint: "This month",
        tone: "purple" as const,
      },
    ],
    watchTimeWeekly,
    completionByCourse,
    enrollmentTrend,
  };
}

function countInBuckets<T>(
  rows: T[],
  buckets: DayBucket[],
  dateOf: (row: T) => Date | null,
) {
  return buckets.map(
    (bucket) =>
      rows.filter((row) => {
        const at = dateOf(row);
        return at !== null && at >= bucket.start && at <= bucket.end;
      }).length,
  );
}

async function getRevenueReport(organizationId: string, start: Date, end: Date) {
  const completed: Prisma.PaymentWhereInput = {
    status: "COMPLETED",
    course: { organizationId },
  };

  const [allTime, inPeriod] = await Promise.all([
    prisma.payment.groupBy({
      by: ["courseId"],
      where: completed,
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: {
        ...completed,
        OR: [
          { completedAt: { gte: start, lte: end } },
          // Older rows approved before completedAt was recorded.
          { completedAt: null, updatedAt: { gte: start, lte: end } },
        ],
      },
      select: { courseId: true, amount: true },
    }),
  ]);

  const courseTitles = allTime.length
    ? await prisma.course.findMany({
        where: { id: { in: allTime.map((row) => row.courseId) } },
        select: { id: true, title: true },
      })
    : [];
  const titleById = new Map(courseTitles.map((course) => [course.id, course.title]));

  const periodByCourse = new Map<string, { paisa: number; count: number }>();
  for (const payment of inPeriod) {
    const entry = periodByCourse.get(payment.courseId) ?? { paisa: 0, count: 0 };
    entry.paisa += payment.amount;
    entry.count += 1;
    periodByCourse.set(payment.courseId, entry);
  }

  const byCourse = allTime
    .map((row) => ({
      courseId: row.courseId,
      title: titleById.get(row.courseId) ?? "Deleted course",
      periodPaisa: periodByCourse.get(row.courseId)?.paisa ?? 0,
      periodPayments: periodByCourse.get(row.courseId)?.count ?? 0,
      totalPaisa: row._sum?.amount ?? 0,
    }))
    .sort((a, b) => b.periodPaisa - a.periodPaisa || b.totalPaisa - a.totalPaisa);

  return {
    periodPaisa: inPeriod.reduce((sum, payment) => sum + payment.amount, 0),
    periodPayments: inPeriod.length,
    totalPaisa: byCourse.reduce((sum, row) => sum + row.totalPaisa, 0),
    byCourse,
  };
}

function paisaToRupees(paisa: number) {
  return (paisa / 100).toFixed(2);
}

export async function getAdminReportsData(
  organizationId: string,
  period: ReportPeriodKey,
) {
  const { start, end } = periodRange(period);
  const buckets = periodBuckets(period);
  const orgEnrollmentFilter = { course: { organizationId } };

  const [
    enrollmentsInPeriod,
    progressInPeriod,
    allEnrollments,
    newUsers,
    roleCounts,
    totalCourses,
    totalEnrollments,
    revenue,
  ] = await Promise.all([
    prisma.enrollment.count({
      where: { ...orgEnrollmentFilter, enrolledAt: { gte: start, lte: end } },
    }),
    prisma.lessonProgress.findMany({
      where: {
        completed: true,
        completedAt: { gte: start, lte: end },
        lesson: { course: { organizationId } },
      },
      select: {
        studentId: true,
        completedAt: true,
        lesson: { select: { duration: true } },
      },
    }),
    prisma.enrollment.findMany({
      where: orgEnrollmentFilter,
      select: { progress: true, course: { select: { category: true } } },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { role: true, createdAt: true },
    }),
    countUsersByRole(),
    prisma.course.count({ where: { organizationId } }),
    prisma.enrollment.count({ where: orgEnrollmentFilter }),
    getRevenueReport(organizationId, start, end),
  ]);

  const activeStudentIds = new Set(progressInPeriod.map((p) => p.studentId));
  const lessonHours =
    Math.round(
      (progressInPeriod.reduce((sum, p) => sum + p.lesson.duration, 0) / 60) *
        10,
    ) / 10;

  const completionRate =
    allEnrollments.length === 0
      ? 0
      : Math.round(
          allEnrollments.reduce((sum, e) => sum + e.progress, 0) /
            allEnrollments.length,
        );

  const categoryMap = new Map<string, number>();
  for (const enrollment of allEnrollments) {
    const cat = enrollment.course.category ?? "Other";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }

  const categoryShare = {
    labels: [...categoryMap.keys()].slice(0, 5),
    series: [...categoryMap.values()].slice(0, 5),
  };

  const newStudents = newUsers.filter((user) => user.role === "STUDENT");
  const newInstructors = newUsers.filter((user) => user.role === "INSTRUCTOR");
  const growthStudents = countInBuckets(newStudents, buckets, (user) => user.createdAt);
  const growthInstructors = countInBuckets(newInstructors, buckets, (user) => user.createdAt);
  const sessionCounts = countInBuckets(progressInPeriod, buckets, (row) => row.completedAt);

  const periodLabels: Record<ReportPeriodKey, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "6m": "Last 6 months",
  };

  const exportRows = [
    ["Metric", "Value", "Period"],
    ["Active learners", String(activeStudentIds.size), period],
    ["New enrollments", String(enrollmentsInPeriod), period],
    ["Lesson hours completed", String(lessonHours), period],
    ["Revenue (NPR)", paisaToRupees(revenue.periodPaisa), period],
    ["Approved payments", String(revenue.periodPayments), period],
    ["Completion rate", `${completionRate}%`, "all time"],
    ["Students (total)", String(roleCounts.STUDENT), "lifetime"],
    ["Instructors (total)", String(roleCounts.INSTRUCTOR), "lifetime"],
    ["Admins (total)", String(roleCounts.ADMIN), "lifetime"],
    ["Courses (total)", String(totalCourses), "lifetime"],
    ["Enrollments (total)", String(totalEnrollments), "lifetime"],
    ["Revenue (NPR, total)", paisaToRupees(revenue.totalPaisa), "lifetime"],
    ["New students", String(newStudents.length), period],
    ["New instructors", String(newInstructors.length), period],
    ...revenue.byCourse.map((row) => [
      `Revenue (NPR) · ${row.title}`,
      paisaToRupees(row.periodPaisa),
      period,
    ]),
  ];

  return {
    label: periodLabels[period],
    period,
    stats: {
      mau: activeStudentIds.size.toLocaleString(),
      mauHint: `${enrollmentsInPeriod} new enrollments`,
      hours: lessonHours >= 1000 ? `${(lessonHours / 1000).toFixed(1)}k` : String(lessonHours),
      hoursHint: "Completed lesson hours",
      completion: `${completionRate}%`,
      completionHint: "Platform average",
    },
    /** Completed payments only; all amounts are NPR paisa. */
    revenue,
    growth: {
      categories: buckets.map((b) => b.label),
      series: [
        { name: "Students", data: growthStudents },
        { name: "Instructors", data: growthInstructors },
      ],
    },
    sessions: {
      categories: buckets.map((b) => b.label),
      series: [{ name: "Lesson completions", data: sessionCounts }],
    },
    categoryShare,
    exportRows,
  };
}

export const ADMIN_PAYMENTS_PAGE_SIZE = 25;

const adminPaymentInclude = {
  user: { select: { id: true, name: true, email: true } },
  course: { select: { id: true, title: true, slug: true } },
  paymentMethod: { select: { id: true, label: true, type: true } },
  reviewedBy: { select: { id: true, name: true } },
} satisfies Prisma.PaymentInclude;

type AdminPaymentRecord = Prisma.PaymentGetPayload<{ include: typeof adminPaymentInclude }>;

export function serializeAdminPayment(payment: AdminPaymentRecord) {
  return {
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    screenshotUrl: payment.screenshotUrl,
    referenceNote: payment.referenceNote,
    rejectionReason: payment.rejectionReason,
    createdAt: payment.createdAt.toISOString(),
    reviewedAt: payment.reviewedAt?.toISOString() ?? null,
    user: payment.user,
    course: payment.course,
    paymentMethod: payment.paymentMethod,
    reviewedBy: payment.reviewedBy,
  };
}

export type AdminPaymentRow = ReturnType<typeof serializeAdminPayment>;

/**
 * "REVIEWED" = everything that has left the pending queue (the History tab).
 * Fetches one extra row to report `hasMore` without a separate COUNT.
 */
export async function listAdminPayments(
  organizationId: string,
  {
    status,
    skip = 0,
    take = ADMIN_PAYMENTS_PAGE_SIZE,
  }: { status?: PaymentStatus | "REVIEWED"; skip?: number; take?: number } = {},
) {
  const rows = await prisma.payment.findMany({
    where: {
      course: { organizationId },
      ...(status === "REVIEWED"
        ? { status: { not: "PENDING" } }
        : status
          ? { status }
          : {}),
    },
    orderBy: [{ createdAt: status === "PENDING" ? "asc" : "desc" }, { id: "asc" }],
    skip,
    take: take + 1,
    include: adminPaymentInclude,
  });

  return {
    payments: rows.slice(0, take).map(serializeAdminPayment),
    hasMore: rows.length > take,
  };
}

export async function getAdminPayment(organizationId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, course: { organizationId } },
    include: adminPaymentInclude,
  });
  return payment ? serializeAdminPayment(payment) : null;
}
