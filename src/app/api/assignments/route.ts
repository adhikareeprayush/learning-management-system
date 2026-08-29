import { prisma } from "@/lib/db";
import { cleanString, isTeacher, jsonError, requireSession } from "@/lib/api";
import { findManagedCourse } from "@/lib/course-access";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const courseId = new URL(request.url).searchParams.get("courseId") || undefined;
  const assignments = await prisma.assignment.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      course:
        session.user.role === "STUDENT"
          ? { enrollments: { some: { studentId: session.user.id } } }
          : session.user.role === "INSTRUCTOR"
            ? { instructorId: session.user.id }
            : {},
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      course: { select: { id: true, slug: true, title: true } },
      submissions: {
        where: session.user.role === "STUDENT" ? { studentId: session.user.id } : undefined,
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  return Response.json({ assignments });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session)) return jsonError("Forbidden", 403);
  const body = await request.json();
  const courseId = cleanString(body.courseId, 100);
  const title = cleanString(body.title, 200);
  if (!courseId || !title) return jsonError("courseId and title are required", 400);
  const course = await findManagedCourse(courseId, session);
  if (!course) return jsonError("Course not found", 404);
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return jsonError("Invalid dueDate", 400);
  const assignment = await prisma.assignment.create({
    data: { courseId: course.id, title, description: cleanString(body.description, 20_000) || null, dueDate },
  });
  return Response.json({ assignment }, { status: 201 });
}
