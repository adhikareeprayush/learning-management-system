import { redirect } from "next/navigation";
import { CertificatesWorkspace } from "@/components/student/certificates-workspace";
import { getServerSession } from "@/lib/auth";
import { syncCertificatesForStudent } from "@/lib/certificates";
import { prisma } from "@/lib/db";

export default async function StudentCertificatesPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

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

  const certificates = [
    ...courseCerts.map((c) => ({
      kind: "course" as const,
      id: c.id,
      credentialId: c.credentialId,
      issuedAt: c.issuedAt.toISOString(),
      course: c.course,
    })),
    ...roadmapCerts.map((c) => ({
      kind: "roadmap" as const,
      id: c.id,
      credentialId: c.credentialId,
      issuedAt: c.issuedAt.toISOString(),
      roadmap: {
        title: c.roadmap.title,
        slug: c.roadmap.slug,
        category: c.roadmap.category,
        courseCount: c.roadmap.courses.length,
      },
    })),
  ].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );

  return (
    <CertificatesWorkspace
      studentName={session.user.name}
      certificates={certificates}
    />
  );
}
