import { prisma } from "@/lib/db";
import { resolveMediaUrl } from "@/lib/imagekit-url";

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
  const assignments = courseIds.length
    ? await prisma.assignment.findMany({
        where: { courseId: { in: courseIds }, dueDate: { gte: new Date() } },
        include: { course: { select: { title: true } } },
        orderBy: { dueDate: "asc" },
        take: 5,
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

  const upcomingDeadlines = assignments
    .filter((a) => a.dueDate && !submittedIds.has(a.id))
    .map((a) => ({
      id: a.id,
      title: a.title,
      course: a.course.title,
      due: formatDue(a.dueDate!),
      priority: priorityFromDue(a.dueDate!),
    }));

  const dueCount = upcomingDeadlines.length;

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
  const enrollmentTrend = {
    categories: months.map((m) => m.label),
    series: [
      {
        name: "Enrollments",
        data: await Promise.all(
          months.map(async (m) => {
            if (!courseIds.length) return 0;
            return prisma.enrollment.count({
              where: {
                courseId: { in: courseIds },
                enrolledAt: { gte: m.start, lte: m.end },
              },
            });
          }),
        ),
      },
    ],
  };

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
    revenueMix: {
      labels: courses.slice(0, 4).map((c) => c.title.split(" ").slice(0, 2).join(" ")),
      series: courses.slice(0, 4).map((c) => c._count.enrollments * (c.price / 100)),
    },
    instructorActivity: recentStudents.slice(0, 4).map((e) => ({
      id: e.id,
      text: `${e.student.name} enrolled in ${e.course.title}`,
      time: e.enrolledAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })),
  };
}

export async function getAdminDashboardData(organizationId: string) {
  const orgMemberFilter = { organizationId };
  const orgCourseFilter = { organizationId };
  const orgEnrollmentFilter = { course: { organizationId } };

  const [userCount, courseCount, enrollmentCount, inReviewCount, students, instructors] =
    await Promise.all([
      prisma.organizationMember.count({ where: orgMemberFilter }),
      prisma.course.count({ where: orgCourseFilter }),
      prisma.enrollment.count({ where: orgEnrollmentFilter }),
      prisma.course.count({ where: { organizationId, status: "IN_REVIEW" } }),
      prisma.organizationMember.count({ where: { organizationId, role: "STUDENT" } }),
      prisma.organizationMember.count({
        where: { organizationId, role: { in: ["INSTRUCTOR", "ORG_ADMIN"] } },
      }),
    ]);

  const months = lastMonths(6);
  const platformGrowth = {
    categories: months.map((m) => m.label),
    series: [
      {
        name: "Students",
        data: await Promise.all(
          months.map((m) =>
            prisma.organizationMember.count({
              where: {
                organizationId,
                role: "STUDENT",
                createdAt: { lte: m.end },
              },
            }),
          ),
        ),
      },
      {
        name: "Instructors",
        data: await Promise.all(
          months.map((m) =>
            prisma.organizationMember.count({
              where: {
                organizationId,
                role: { in: ["INSTRUCTOR", "ORG_ADMIN"] },
                createdAt: { lte: m.end },
              },
            }),
          ),
        ),
      },
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

  const recentUsers = await prisma.organizationMember.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { id: true, name: true, role: true, createdAt: true } } },
  });

  return {
    stats: [
      {
        id: "users",
        label: "Total users",
        value: String(userCount),
        delta: `${students} students`,
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
        delta: "Active coaches",
        tone: "mint" as const,
      },
    ],
    platformGrowth,
    roleDistribution: {
      labels: ["Students", "Instructors", "Admins"],
      series: [
        students,
        instructors,
        userCount - students - instructors,
      ],
    },
    moderationQueue: moderationQueue.map((c) => ({
      id: c.id,
      title: c.title,
      instructor: c.instructor.name,
      status: c.status,
      submitted: c.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })),
    adminActivity: recentUsers.map((m) => ({
      id: m.user.id,
      text: `${m.user.name} joined as ${m.role.toLowerCase()}`,
      time: m.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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
      bucketEnd.setDate(bucketStart.getDate() + 6);
      if (bucketEnd > end) bucketEnd.setTime(end.getTime());
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
    const avgRating =
      course.reviews.length === 0
        ? 5
        : Math.round(
            course.reviews.reduce((sum, r) => sum + r.rating, 0) /
              course.reviews.length,
          );
    return {
      id: course.slug,
      title: course.title,
      image: resolveMediaUrl(course.thumbnail),
      students: formatStudentCount(course._count.enrollments),
      duration: formatCourseDuration(course.duration),
      price: `$${(course.price / 100).toFixed(2)}`,
      category: course.category ?? undefined,
      date: course.createdAt.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }),
      rating: avgRating,
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
  const enrollmentTrend = {
    categories: months.map((m) => m.label),
    series: [
      {
        name: "Enrollments",
        data: await Promise.all(
          months.map(async (m) => {
            if (!courseIds.length) return 0;
            return prisma.enrollment.count({
              where: {
                courseId: { in: courseIds },
                enrolledAt: { gte: m.start, lte: m.end },
              },
            });
          }),
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
    studentsInPeriod,
    instructorsInPeriod,
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
        lesson: { select: { duration: true } },
      },
    }),
    prisma.enrollment.findMany({
      where: orgEnrollmentFilter,
      select: { progress: true, course: { select: { category: true } } },
    }),
    prisma.organizationMember.count({
      where: { organizationId, role: "STUDENT", createdAt: { gte: start, lte: end } },
    }),
    prisma.organizationMember.count({
      where: {
        organizationId,
        role: { in: ["INSTRUCTOR", "ORG_ADMIN"] },
        createdAt: { gte: start, lte: end },
      },
    }),
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

  const growthStudents = await Promise.all(
    buckets.map((bucket) =>
      prisma.organizationMember.count({
        where: {
          organizationId,
          role: "STUDENT",
          createdAt: { gte: bucket.start, lte: bucket.end },
        },
      }),
    ),
  );

  const growthInstructors = await Promise.all(
    buckets.map((bucket) =>
      prisma.organizationMember.count({
        where: {
          organizationId,
          role: { in: ["INSTRUCTOR", "ORG_ADMIN"] },
          createdAt: { gte: bucket.start, lte: bucket.end },
        },
      }),
    ),
  );

  const sessionCounts = await Promise.all(
    buckets.map((bucket) =>
      prisma.lessonProgress.count({
        where: {
          completed: true,
          completedAt: { gte: bucket.start, lte: bucket.end },
          lesson: { course: { organizationId } },
        },
      }),
    ),
  );

  const periodLabels: Record<ReportPeriodKey, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "6m": "Last 6 months",
  };

  const [totalStudents, totalInstructors, totalCourses, totalEnrollments] =
    await Promise.all([
      prisma.organizationMember.count({ where: { organizationId, role: "STUDENT" } }),
      prisma.organizationMember.count({
        where: { organizationId, role: { in: ["INSTRUCTOR", "ORG_ADMIN"] } },
      }),
      prisma.course.count({ where: { organizationId } }),
      prisma.enrollment.count({ where: orgEnrollmentFilter }),
    ]);

  const exportRows = [
    ["Metric", "Value", "Period"],
    ["Active learners", String(activeStudentIds.size), period],
    ["New enrollments", String(enrollmentsInPeriod), period],
    ["Lesson hours completed", String(lessonHours), period],
    ["Completion rate", `${completionRate}%`, "all time"],
    ["Students (total)", String(totalStudents), "lifetime"],
    ["Instructors (total)", String(totalInstructors), "lifetime"],
    ["Courses (total)", String(totalCourses), "lifetime"],
    ["Enrollments (total)", String(totalEnrollments), "lifetime"],
    ["New students", String(studentsInPeriod), period],
    ["New instructors", String(instructorsInPeriod), period],
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
