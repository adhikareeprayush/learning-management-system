import { prisma } from "@/lib/db";
import {
  isTeacher,
  jsonError,
  requireSession,
  requireTenantApi,
} from "@/lib/api";
import {
  boundedText,
  canAccessLesson,
  findLessonForTeacher,
  readJsonObject,
} from "@/lib/course-access";
import { parseResourceUrl, redactResourceForLearner } from "@/lib/lesson-resources";

type Params = { params: Promise<{ lessonId: string }> };

const RESOURCE_TYPES = new Set(["VIDEO", "TEXT", "EXERCISE", "QUIZ"]);

export async function GET(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { lessonId } = await params;
  if (
    !(await canAccessLesson(
      lessonId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Forbidden", 403);
  }

  const resources = await prisma.lessonResource.findMany({
    where: { lessonId },
    orderBy: { createdAt: "asc" },
  });

  const canManage =
    isTeacher(session, tenant.member) &&
    Boolean(
      await findLessonForTeacher(
        lessonId,
        tenant.organizationId,
        session,
        tenant.member,
      ),
    );

  return Response.json({
    resources: canManage ? resources : resources.map(redactResourceForLearner),
  });
}

export async function POST(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { lessonId } = await params;
  if (
    !(await findLessonForTeacher(
      lessonId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Lesson not found", 404);
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const type = typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
  if (!RESOURCE_TYPES.has(type)) {
    return jsonError("type must be VIDEO, TEXT, EXERCISE, or QUIZ", 400);
  }

  const title = boundedText(body.title, "title", 200, { required: true });
  if (!title.ok) return jsonError(title.error, 400);
  const description = boundedText(body.description, "description", 50_000);
  if (!description.ok) return jsonError(description.error, 400);
  const url = parseResourceUrl(type, body.url);
  if (!url.ok) return jsonError(url.error, 400);

  const resource = await prisma.lessonResource.create({
    data: {
      lessonId,
      type: type as "VIDEO" | "TEXT" | "EXERCISE" | "QUIZ",
      title: title.value,
      url: url.url ?? "",
      description: description.value || null,
    },
  });

  return Response.json({ resource }, { status: 201 });
}
