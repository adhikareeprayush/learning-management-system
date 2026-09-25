import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import {
  resolveDashboardScope,
  type DashboardSearchResult,
} from "@/lib/nav";
import { formatCoursePrice } from "@/lib/pricing";

const MIN_QUERY = 2;
const MAX_RESULTS = 8;

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

function courseMatch(q: string): Prisma.CourseWhereInput {
  return { OR: [{ title: contains(q) }, { category: contains(q) }] };
}

async function searchAsStudent(
  userId: string,
  organizationId: string,
  q: string,
): Promise<DashboardSearchResult[]> {
  const [enrollments, assignments] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        studentId: userId,
        course: { organizationId, ...courseMatch(q) },
      },
      orderBy: { enrolledAt: "desc" },
      take: 4,
      select: {
        progress: true,
        course: {
          select: { id: true, slug: true, title: true, category: true },
        },
      },
    }),
    prisma.assignment.findMany({
      where: {
        title: contains(q),
        course: {
          organizationId,
          enrollments: { some: { studentId: userId } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true, title: true, course: { select: { title: true } } },
    }),
  ]);

  const enrolledIds = enrollments.map((e) => e.course.id);
  const catalog = await prisma.course.findMany({
    where: {
      organizationId,
      status: "PUBLISHED",
      id: { notIn: enrolledIds },
      ...courseMatch(q),
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      price: true,
      priceNpr: true,
    },
  });

  return [
    ...enrollments.map(
      ({ course, progress }): DashboardSearchResult => ({
        id: `enrolled-${course.id}`,
        title: course.title,
        meta: `My course · ${Math.round(progress)}% complete`,
        href: `/student/courses/${course.slug}`,
        kind: "course",
      }),
    ),
    ...assignments.map(
      (assignment): DashboardSearchResult => ({
        id: `assignment-${assignment.id}`,
        title: assignment.title,
        meta: `Assignment · ${assignment.course.title}`,
        href: "/student/assignments",
        kind: "assignment",
      }),
    ),
    ...catalog.map(
      (course): DashboardSearchResult => ({
        id: `catalog-${course.id}`,
        title: course.title,
        meta: `Catalog · ${[course.category, formatCoursePrice(course)]
          .filter(Boolean)
          .join(" · ")}`,
        href: `/courses/${course.slug}`,
        kind: "course",
      }),
    ),
  ];
}

async function searchAsInstructor(
  userId: string,
  organizationId: string,
  q: string,
): Promise<DashboardSearchResult[]> {
  const ownCourse = { instructorId: userId, organizationId };
  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { ...ownCourse, ...courseMatch(q) },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.enrollment.findMany({
      where: {
        course: ownCourse,
        student: { OR: [{ name: contains(q) }, { email: contains(q) }] },
      },
      orderBy: { enrolledAt: "desc" },
      take: 20,
      select: {
        student: { select: { id: true, name: true } },
        course: { select: { title: true, slug: true } },
      },
    }),
  ]);

  const students = new Map<
    string,
    { name: string; courseTitle: string; slug: string; others: number }
  >();
  for (const { student, course } of enrollments) {
    const existing = students.get(student.id);
    if (existing) existing.others += 1;
    else
      students.set(student.id, {
        name: student.name,
        courseTitle: course.title,
        slug: course.slug,
        others: 0,
      });
  }

  return [
    ...courses.map(
      (course): DashboardSearchResult => ({
        id: `course-${course.id}`,
        title: course.title,
        meta: `${titleCase(course.status)} · ${course._count.enrollments} enrolled`,
        href: `/instructor/courses/${course.slug}`,
        kind: "course",
      }),
    ),
    ...[...students.entries()].slice(0, 4).map(
      ([id, student]): DashboardSearchResult => ({
        id: `student-${id}`,
        title: student.name,
        meta: `Student · ${student.courseTitle}${
          student.others > 0 ? ` +${student.others} more` : ""
        }`,
        href: `/instructor/courses/${student.slug}/students`,
        kind: "user",
      }),
    ),
  ];
}

async function searchAsAdmin(
  organizationId: string,
  q: string,
): Promise<DashboardSearchResult[]> {
  const [users, courses] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationMembers: { some: { organizationId } },
        OR: [{ name: contains(q) }, { email: contains(q) }],
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.course.findMany({
      where: { organizationId, ...courseMatch(q) },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, title: true, category: true, status: true },
    }),
  ]);

  return [
    ...users.map(
      (user): DashboardSearchResult => ({
        id: `user-${user.id}`,
        title: user.name,
        meta: `${titleCase(user.role)} · ${user.email}`,
        href: `/admin/users?q=${encodeURIComponent(user.email)}`,
        kind: "user",
      }),
    ),
    ...courses.map(
      (course): DashboardSearchResult => ({
        id: `course-${course.id}`,
        title: course.title,
        meta: [course.category, titleCase(course.status)]
          .filter(Boolean)
          .join(" · "),
        href: `/admin/courses?q=${encodeURIComponent(course.title)}`,
        kind: "course",
      }),
    ),
  ];
}

export async function GET(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Authentication required", 401);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  const scope = resolveDashboardScope(
    session.user.role,
    searchParams.get("scope"),
  );

  if (q.length < MIN_QUERY) {
    return Response.json({ scope, q, results: [] });
  }

  try {
    const results =
      scope === "admin"
        ? await searchAsAdmin(tenant.organizationId, q)
        : scope === "instructor"
          ? await searchAsInstructor(session.user.id, tenant.organizationId, q)
          : await searchAsStudent(session.user.id, tenant.organizationId, q);

    return Response.json({ scope, q, results: results.slice(0, MAX_RESULTS) });
  } catch (error) {
    console.error("GET /api/search", error);
    return jsonError("Internal server error", 500);
  }
}
