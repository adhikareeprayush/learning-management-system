import { prisma } from "@/lib/db";
import {
  cleanString,
  finiteNumber,
  isTeacher,
  jsonError,
  requireSession,
} from "@/lib/api";
import { canAccessLesson, findLessonForTeacher } from "@/lib/course-access";

type Params = { params: Promise<{ lessonId: string }> };

const RESOURCE_TYPES = new Set(["VIDEO", "TEXT", "EXERCISE", "QUIZ"]);

export async function GET(_request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { lessonId } = await params;
  if (!(await canAccessLesson(lessonId, session))) {
    return jsonError("Forbidden", 403);
  }

  const resources = await prisma.lessonResource.findMany({
    where: { lessonId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ resources });
}

export async function POST(request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session)) return jsonError("Forbidden", 403);

  const { lessonId } = await params;
  if (!(await findLessonForTeacher(lessonId, session))) {
    return jsonError("Lesson not found", 404);
  }

  const body = await request.json();
  const type = cleanString(body.type, 20).toUpperCase();
  if (!RESOURCE_TYPES.has(type)) {
    return jsonError("type must be VIDEO, TEXT, EXERCISE, or QUIZ", 400);
  }

  const title = cleanString(body.title, 200);
  if (!title) return jsonError("title is required", 400);

  const resource = await prisma.lessonResource.create({
    data: {
      lessonId,
      type: type as "VIDEO" | "TEXT" | "EXERCISE" | "QUIZ",
      title,
      url: cleanString(body.url, 2_000),
      description: cleanString(body.description, 50_000) || null,
    },
  });

  return Response.json({ resource }, { status: 201 });
}
