import type { OrganizationMember } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  isTeacher,
  jsonError,
  requireSession,
  requireTenantApi,
  type AppSession,
} from "@/lib/api";
import {
  boundedText,
  canAccessLesson,
  findLessonForTeacher,
  readJsonObject,
} from "@/lib/course-access";
import { parseResourceUrl, redactResourceForLearner } from "@/lib/lesson-resources";

type Params = { params: Promise<{ resourceId: string }> };

async function getResource(resourceId: string, organizationId: string) {
  const resource = await prisma.lessonResource.findUnique({
    where: { id: resourceId },
    include: {
      lesson: {
        select: { id: true, courseId: true, course: { select: { organizationId: true } } },
      },
    },
  });
  if (!resource || resource.lesson.course.organizationId !== organizationId) return null;
  return resource;
}

/** The resource when this user may author it, otherwise null. */
async function findManagedResource(
  resourceId: string,
  organizationId: string,
  session: AppSession,
  member: OrganizationMember | null,
) {
  if (!isTeacher(session, member)) return null;
  const resource = await getResource(resourceId, organizationId);
  if (!resource) return null;
  const lesson = await findLessonForTeacher(resource.lessonId, organizationId, session, member);
  return lesson ? resource : null;
}

export async function GET(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { resourceId } = await params;
  const resource = await getResource(resourceId, tenant.organizationId);
  if (!resource) return jsonError("Resource not found", 404);
  if (
    !(await canAccessLesson(
      resource.lessonId,
      tenant.organizationId,
      session,
      tenant.member,
    ))
  ) {
    return jsonError("Forbidden", 403);
  }

  const canManage = Boolean(
    await findManagedResource(resource.id, tenant.organizationId, session, tenant.member),
  );

  const latestAttempt = canManage
    ? null
    : await prisma.resourceAttempt.findFirst({
        where: {
          resourceId: resource.id,
          studentId: session.user.id,
        },
        orderBy: { createdAt: "desc" },
      });

  return Response.json({
    resource: canManage ? resource : redactResourceForLearner(resource),
    latestAttempt,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { resourceId } = await params;
  const resource = await findManagedResource(
    resourceId,
    tenant.organizationId,
    session,
    tenant.member,
  );
  if (!resource) return jsonError("Resource not found", 404);

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const title = boundedText(body.title, "title", 200, { required: body.title !== undefined });
  if (!title.ok) return jsonError(title.error, 400);
  const description = boundedText(body.description, "description", 50_000);
  if (!description.ok) return jsonError(description.error, 400);
  // Only a changed URL is validated, so older stored links keep saving.
  let url: string | undefined;
  if (body.url !== undefined && body.url !== resource.url) {
    const parsed = parseResourceUrl(resource.type, body.url);
    if (!parsed.ok) return jsonError(parsed.error, 400);
    url = parsed.url ?? "";
  }

  const updated = await prisma.lessonResource.update({
    where: { id: resourceId },
    data: {
      ...(body.title !== undefined ? { title: title.value } : {}),
      ...(url !== undefined ? { url } : {}),
      ...(body.description !== undefined
        ? { description: description.value || null }
        : {}),
    },
  });

  return Response.json({ resource: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { resourceId } = await params;
  if (!(await findManagedResource(resourceId, tenant.organizationId, session, tenant.member))) {
    return jsonError("Resource not found", 404);
  }

  await prisma.lessonResource.delete({ where: { id: resourceId } });
  return new Response(null, { status: 204 });
}
