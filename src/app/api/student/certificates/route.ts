import { prisma } from "@/lib/db";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";

export async function GET() {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const certificates = await prisma.certificate.findMany({
    where: {
      studentId: session.user.id,
      course: { organizationId: tenant.organizationId },
    },
    orderBy: { issuedAt: "desc" },
    include: {
      course: {
        select: {
          title: true,
          slug: true,
          instructor: { select: { name: true } },
        },
      },
    },
  });

  return Response.json({ certificates });
}
