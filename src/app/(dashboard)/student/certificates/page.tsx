import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CertificatesWorkspace } from "@/components/student/certificates-workspace";
import { getServerSession } from "@/lib/auth";
import {
  certificateVerifyUrl,
  syncCertificatesForStudent,
} from "@/lib/certificates";
import { prisma } from "@/lib/db";
import { loginRedirectPath } from "@/lib/page-guards";

export const metadata: Metadata = { title: "Certificates" };

export default async function StudentCertificatesPage() {
  const session = await getServerSession();
  if (!session) redirect(await loginRedirectPath());

  await syncCertificatesForStudent(session.user.id);

  const [courseCerts, roadmapCerts] = await Promise.all([
    prisma.certificate.findMany({
      where: { studentId: session.user.id },
      orderBy: { issuedAt: "desc" },
      include: {
        course: {
          select: {
            title: true,
            slug: true,
            category: true,
            instructor: { select: { name: true } },
          },
        },
      },
    }),
    prisma.roadmapCertificate.findMany({
      where: { studentId: session.user.id },
      orderBy: { issuedAt: "desc" },
      include: {
        roadmap: {
          select: {
            title: true,
            slug: true,
            category: true,
            courses: {
              where: { course: { status: "PUBLISHED" } },
              select: { id: true },
            },
          },
        },
      },
    }),
  ]);

  // Issued snapshots win so a later rename never changes an issued credential;
  // live values only fill rows that predate the snapshot columns.
  const certificates = [
    ...courseCerts.map((c) => ({
      kind: "course" as const,
      id: c.id,
      credentialId: c.credentialId,
      issuedAt: c.issuedAt.toISOString(),
      holderName: c.holderName ?? session.user.name,
      verifyUrl: certificateVerifyUrl(c.credentialId),
      course: {
        title: c.courseTitle ?? c.course.title,
        slug: c.course.slug,
        category: c.course.category,
        instructorName: c.instructorName ?? c.course.instructor.name,
      },
    })),
    ...roadmapCerts.map((c) => ({
      kind: "roadmap" as const,
      id: c.id,
      credentialId: c.credentialId,
      issuedAt: c.issuedAt.toISOString(),
      holderName: c.holderName ?? session.user.name,
      verifyUrl: certificateVerifyUrl(c.credentialId),
      roadmap: {
        title: c.roadmapTitle ?? c.roadmap.title,
        slug: c.roadmap.slug,
        category: c.roadmap.category,
        courseCount: c.courseCount ?? c.roadmap.courses.length,
      },
    })),
  ].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );

  return <CertificatesWorkspace certificates={certificates} />;
}
