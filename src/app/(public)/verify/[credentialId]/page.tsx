import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import {
  courseCertificateContent,
  formatCertificateDate,
  roadmapCertificateContent,
  type CertificateContent,
} from "@/lib/certificate-design";
import { prisma } from "@/lib/db";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { CredentialForm } from "../credential-form";

type Props = { params: Promise<{ credentialId: string }> };

type VerifiedCredential = {
  kind: "course" | "roadmap";
  holder: string;
  title: string;
  href: string | null;
  issuedAt: Date;
  issuer: string;
  content: CertificateContent;
};

const CREDENTIAL_ID = /^[A-Za-z0-9_-]{1,100}$/;

/** Org-scoped lookup shared by the page and its metadata. Selects no contact details. */
const findCredential = cache(
  async (credentialId: string): Promise<VerifiedCredential | null> => {
    if (!CREDENTIAL_ID.test(credentialId)) return null;
    const tenant = await resolveTenantFromHeaders();
    if (!tenant) return null;
    const organizationId = tenant.organizationId;

    const [courseCertificate, roadmapCertificate] = await Promise.all([
      prisma.certificate.findFirst({
        where: { credentialId, course: { organizationId } },
        select: {
          credentialId: true,
          issuedAt: true,
          student: { select: { name: true } },
          course: {
            select: {
              title: true,
              slug: true,
              status: true,
              category: true,
              instructor: { select: { name: true } },
            },
          },
        },
      }),
      prisma.roadmapCertificate.findFirst({
        where: { credentialId, roadmap: { organizationId } },
        select: {
          credentialId: true,
          issuedAt: true,
          student: { select: { name: true } },
          roadmap: {
            select: {
              title: true,
              slug: true,
              status: true,
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

    if (courseCertificate) {
      const { course, student } = courseCertificate;
      return {
        kind: "course",
        holder: student.name,
        title: course.title,
        href: course.status === "PUBLISHED" ? `/courses/${course.slug}` : null,
        issuedAt: courseCertificate.issuedAt,
        issuer: tenant.organization.name,
        content: courseCertificateContent({
          studentName: student.name,
          courseTitle: course.title,
          instructorName: course.instructor.name,
          category: course.category,
          credentialId: courseCertificate.credentialId,
          issuedAt: courseCertificate.issuedAt,
        }),
      };
    }

    if (roadmapCertificate) {
      const { roadmap, student } = roadmapCertificate;
      return {
        kind: "roadmap",
        holder: student.name,
        title: roadmap.title,
        href:
          roadmap.status === "PUBLISHED" ? `/roadmaps/${roadmap.slug}` : null,
        issuedAt: roadmapCertificate.issuedAt,
        issuer: tenant.organization.name,
        content: roadmapCertificateContent({
          studentName: student.name,
          roadmapTitle: roadmap.title,
          courseCount: roadmap.courses.length,
          category: roadmap.category,
          credentialId: roadmapCertificate.credentialId,
          issuedAt: roadmapCertificate.issuedAt,
        }),
      };
    }

    return null;
  },
);

function decodeParam(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const credentialId = decodeParam((await params).credentialId);
  const credential = await findCredential(credentialId);
  return {
    title: credential
      ? `Verified: ${credential.holder} · ${credential.title}`
      : "Credential not found",
    description: credential
      ? `${credential.content.label} issued to ${credential.holder} on ${formatCertificateDate(credential.issuedAt)}.`
      : "No certificate matches this credential ID.",
    // Holder names are personal data; keep verification pages out of search results.
    robots: { index: false, follow: false },
  };
}

export default async function VerifyCredentialPage({ params }: Props) {
  const credentialId = decodeParam((await params).credentialId);
  const credential = await findCredential(credentialId);

  if (!credential) {
    return (
      <div className="bg-[#f7f8fc] pb-20">
        <div className="mx-auto max-w-2xl px-5 py-14">
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
                <ShieldAlert className="size-6" />
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-2xl text-brand-navy">
                  Credential not found
                </h1>
                <p className="mt-2 text-sm text-muted">
                  No certificate issued by this institute matches{" "}
                  <code className="break-all rounded bg-surface px-1.5 py-0.5 font-mono text-[13px] text-brand-navy">
                    {credentialId || "(empty)"}
                  </code>
                  . Check the ID printed on the certificate and try again.
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-black/5 pt-6">
              <CredentialForm defaultValue={credentialId} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const details = [
    { label: "Awarded to", value: credential.holder },
    {
      label: credential.kind === "course" ? "Course" : "Learning path",
      value: credential.title,
      href: credential.href,
    },
    { label: "Issued on", value: formatCertificateDate(credential.issuedAt) },
    { label: "Issued by", value: credential.issuer },
    { label: "Credential ID", value: credential.content.credentialId, mono: true },
  ];

  return (
    <div className="bg-[#f7f8fc] pb-20">
      <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-10 sm:px-6 md:py-14">
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Valid credential
              </p>
              <h1 className="mt-1 font-display text-2xl text-brand-navy md:text-3xl">
                {credential.content.label}
              </h1>
              <p className="mt-2 text-sm text-muted">
                This certificate was issued by {credential.issuer} and matches
                our records.
              </p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 border-t border-black/5 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {details.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {item.label}
                </dt>
                <dd
                  className={`mt-1 break-words text-[15px] font-semibold text-[#324361] ${
                    item.mono ? "font-mono text-sm" : ""
                  }`}
                >
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-brand-purple transition hover:text-brand-teal"
                    >
                      {item.value}
                    </Link>
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <CertificatePreview content={credential.content} />
        </div>

        <p className="text-center text-sm text-muted">
          Verifying another certificate?{" "}
          <Link
            href="/verify"
            className="font-semibold text-brand-purple hover:text-brand-teal"
          >
            Enter a credential ID
          </Link>
        </p>
      </div>
    </div>
  );
}
