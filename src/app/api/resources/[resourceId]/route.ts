import type { OrganizationMember } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  cleanString,
  isTeacher,
  jsonError,
  requireSession,
  requireTenantApi,
  type AppSession,
} from "@/lib/api";
import { canAccessLesson, findLessonForTeacher } from "@/lib/course-access";

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

async function teacherCanManage(
  resourceId: string,
  organizationId: string,
  session: AppSession,
  member: OrganizationMember | null,
) {
  if (!isTeacher(session, member)) return false;
  const resource = await getResource(resourceId, organizationId);
  if (!resource) return false;
  return Boolean(
    await findLessonForTeacher(
      resource.lessonId,
      organizationId,
      session,
      member,
    ),
  );
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

  const latestAttempt =
    tenant.member?.role === "STUDENT"
      ? await prisma.resourceAttempt.findFirst({
          where: {
            resourceId: resource.id,
            studentId: session.user.id,
          },
          orderBy: { createdAt: "desc" },
        })
      : null;

  return Response.json({ resource, latestAttempt });
}

export async function PATCH(request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) return jsonError("Forbidden", 403);

  const { resourceId } = await params;
  if (!(await teacherCanManage(resourceId, tenant.organizationId, session, tenant.member))) {
    return jsonError("Resource not found", 404);
  }

  const body = await request.json();
  const updated = await prisma.lessonResource.update({
    where: { id: resourceId },
    data: {
      ...(body.title !== undefined
        ? { title: cleanString(body.title, 200) }
        : {}),
      ...(body.url !== undefined ? { url: cleanString(body.url, 2_000) } : {}),
      ...(body.description !== undefined
        ? { description: cleanString(body.description, 50_000) || null }
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
  if (!(await teacherCanManage(resourceId, tenant.organizationId, session, tenant.member))) {
    return jsonError("Resource not found", 404);
  }

  await prisma.lessonResource.delete({ where: { id: resourceId } });
  return new Response(null, { status: 204 });
}
