import { prisma } from "@/lib/db";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import {
  generateRoadmapCertificatePdf,
  roadmapCertificatePdfFilename,
} from "@/lib/certificate-pdf";

type Params = { params: Promise<{ certificateId: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { certificateId } = await params;

  const certificate = await prisma.roadmapCertificate.findFirst({
    where: {
      id: certificateId,
      studentId: session.user.id,
      roadmap: { organizationId: tenant.organizationId },
    },
    include: {
      student: { select: { name: true } },
      roadmap: {
        select: {
          title: true,
          category: true,
          courses: {
            where: { course: { status: "PUBLISHED" } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!certificate) return jsonError("Certificate not found", 404);

  const pdfBytes = await generateRoadmapCertificatePdf({
    studentName: certificate.student.name,
    roadmapTitle: certificate.roadmap.title,
    courseCount: certificate.roadmap.courses.length,
    category: certificate.roadmap.category,
    credentialId: certificate.credentialId,
    issuedAt: certificate.issuedAt,
  });

  const filename = roadmapCertificatePdfFilename(certificate.roadmap.title);

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
