import { prisma } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";
import {
  certificatePdfFilename,
  generateCertificatePdf,
} from "@/lib/certificate-pdf";

type Params = { params: Promise<{ certificateId: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { certificateId } = await params;

  const certificate = await prisma.certificate.findFirst({
    where: {
      id: certificateId,
      studentId: session.user.id,
    },
    include: {
      student: { select: { name: true } },
      course: {
        select: {
          title: true,
          category: true,
          instructor: { select: { name: true } },
        },
      },
    },
  });

  if (!certificate) return jsonError("Certificate not found", 404);

  const pdfBytes = await generateCertificatePdf({
    studentName: certificate.student.name,
    courseTitle: certificate.course.title,
    instructorName: certificate.course.instructor.name,
    category: certificate.course.category,
    credentialId: certificate.credentialId,
    issuedAt: certificate.issuedAt,
  });

  const filename = certificatePdfFilename(certificate.course.title);

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
