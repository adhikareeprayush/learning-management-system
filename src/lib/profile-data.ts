import { prisma } from "@/lib/db";

export type ExtendedProfileFields = {
  headline: string;
  location: string;
  website: string;
  phone: string;
  linkedIn: string;
  github: string;
};

export const emptyExtendedProfile: ExtendedProfileFields = {
  headline: "",
  location: "",
  website: "",
  phone: "",
  linkedIn: "",
  github: "",
};

export function parseExtendedProfile(preferences: unknown): ExtendedProfileFields {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
    return { ...emptyExtendedProfile };
  }
  const profile = (preferences as Record<string, unknown>).profile;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return { ...emptyExtendedProfile };
  }
  const p = profile as Record<string, unknown>;
  return {
    headline: typeof p.headline === "string" ? p.headline : "",
    location: typeof p.location === "string" ? p.location : "",
    website: typeof p.website === "string" ? p.website : "",
    phone: typeof p.phone === "string" ? p.phone : "",
    linkedIn: typeof p.linkedIn === "string" ? p.linkedIn : "",
    github: typeof p.github === "string" ? p.github : "",
  };
}

export function mergeExtendedProfile(
  preferences: unknown,
  fields: Partial<ExtendedProfileFields>,
): Record<string, unknown> {
  const base =
    preferences && typeof preferences === "object" && !Array.isArray(preferences)
      ? { ...(preferences as Record<string, unknown>) }
      : {};
  const current = parseExtendedProfile(base);
  base.profile = { ...current, ...fields };
  return base;
}

export type ProfileActivity = {
  id: string;
  text: string;
  time: string;
};

export type ProfileStats = {
  label: string;
  value: string;
  hint?: string;
};

export async function getStudentProfileStats(userId: string) {
  const [enrollments, certificates, lessonsCompleted, assignmentsDue, submissions] =
    await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId: userId },
        select: { progress: true },
      }),
      prisma.certificate.count({ where: { studentId: userId } }),
      prisma.lessonProgress.count({
        where: { studentId: userId, completed: true },
      }),
      prisma.assignment.count({
        where: {
          course: { enrollments: { some: { studentId: userId } } },
          dueDate: { gte: new Date() },
        },
      }),
      prisma.submission.count({
        where: { studentId: userId, status: { not: "PENDING" } },
      }),
    ]);

  const inProgress = enrollments.filter((e) => e.progress > 0 && e.progress < 100).length;
  const completed = enrollments.filter((e) => e.progress >= 100).length;

  const stats: ProfileStats[] = [
    { label: "Enrolled", value: String(enrollments.length) },
    { label: "In progress", value: String(inProgress) },
    { label: "Completed", value: String(completed) },
    { label: "Certificates", value: String(certificates) },
    { label: "Lessons done", value: String(lessonsCompleted) },
    { label: "Submissions", value: String(submissions) },
  ];

  const recentProgress = await prisma.lessonProgress.findMany({
    where: { studentId: userId, completed: true },
    orderBy: { completedAt: "desc" },
    take: 5,
    include: { lesson: { select: { title: true } } },
  });

  const activity: ProfileActivity[] = recentProgress.map((row) => ({
    id: row.id,
    text: `Completed “${row.lesson.title}”`,
    time: row.completedAt
      ? row.completedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Recently",
  }));

  return { stats, activity, assignmentsDue };
}

export async function getInstructorProfileStats(userId: string) {
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    include: {
      _count: { select: { enrollments: true, reviews: true } },
      reviews: { select: { rating: true } },
    },
  });

  const published = courses.filter((c) => c.status === "PUBLISHED").length;
  const students = courses.reduce((sum, c) => sum + c._count.enrollments, 0);
  const allRatings = courses.flatMap((c) => c.reviews.map((r) => r.rating));
  const avgRating =
    allRatings.length === 0
      ? 0
      : Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10;

  const stats: ProfileStats[] = [
    { label: "Courses", value: String(courses.length) },
    { label: "Published", value: String(published) },
    { label: "Students", value: String(students) },
    { label: "Reviews", value: String(allRatings.length) },
    { label: "Avg rating", value: avgRating > 0 ? String(avgRating) : "—" },
  ];

  const recentEnrollments = await prisma.enrollment.findMany({
    where: { course: { instructorId: userId } },
    orderBy: { enrolledAt: "desc" },
    take: 5,
    include: {
      student: { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  const activity: ProfileActivity[] = recentEnrollments.map((row) => ({
    id: row.id,
    text: `${row.student.name} enrolled in ${row.course.title}`,
    time: row.enrolledAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return { stats, activity };
}

export async function getAdminProfileStats() {
  const [users, students, instructors, courses, enrollments, inReview] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "INSTRUCTOR" } }),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.course.count({ where: { status: "IN_REVIEW" } }),
    ]);

  const stats: ProfileStats[] = [
    { label: "Total users", value: String(users) },
    { label: "Students", value: String(students) },
    { label: "Instructors", value: String(instructors) },
    { label: "Courses", value: String(courses) },
    { label: "Enrollments", value: String(enrollments) },
    { label: "In review", value: String(inReview) },
  ];

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, role: true, createdAt: true },
  });

  const activity: ProfileActivity[] = recentUsers.map((row) => ({
    id: row.id,
    text: `${row.name} joined as ${row.role.toLowerCase()}`,
    time: row.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return { stats, activity };
}

export async function getProfileBundle(userId: string, role: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      preferences: true,
    },
  });

  if (!user) return null;

  const extended = parseExtendedProfile(user.preferences);

  if (role === "INSTRUCTOR") {
    const { stats, activity } = await getInstructorProfileStats(userId);
    return { user, extended, stats, activity };
  }

  if (role === "ADMIN") {
    const { stats, activity } = await getAdminProfileStats();
    return { user, extended, stats, activity };
  }

  const { stats, activity, assignmentsDue } = await getStudentProfileStats(userId);
  return { user, extended, stats, activity, assignmentsDue };
}
