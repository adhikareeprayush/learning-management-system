import { prisma } from "@/lib/db";
import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import {
  generateRoadmapCertificatePdf,
  roadmapCertificatePdfFilename,
} from "@/lib/certificate-pdf";
import { certificateVerifyUrl } from "@/lib/certificates";

type Params = { params: Promise<{ certificateId: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
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

  // Issued snapshot first; live values only for rows that predate snapshots.
  const roadmapTitle = certificate.roadmapTitle ?? certificate.roadmap.title;
  const pdfBytes = await generateRoadmapCertificatePdf({
    studentName: certificate.holderName ?? certificate.student.name,
    roadmapTitle,
    courseCount: certificate.courseCount ?? certificate.roadmap.courses.length,
    category: certificate.roadmap.category,
    credentialId: certificate.credentialId,
    issuedAt: certificate.issuedAt,
    verifyUrl: certificateVerifyUrl(certificate.credentialId),
  });

  const filename = roadmapCertificatePdfFilename(roadmapTitle);

  const disposition =
    new URL(request.url).searchParams.get("inline") === "1"
      ? "inline"
      : "attachment";

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
