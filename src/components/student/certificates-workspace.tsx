"use client";

import { useState } from "react";
import { Award, Download, Loader2, Route } from "lucide-react";
import { CertificatePreview } from "@/components/certificate/certificate-preview";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FlashBanner } from "@/components/ui/flash-banner";

type CourseCertificateItem = {
  kind: "course";
  id: string;
  credentialId: string;
  issuedAt: string;
  course: {
    title: string;
    slug: string;
    category?: string | null;
    instructor: { name: string };
  };
};

type RoadmapCertificateItem = {
  kind: "roadmap";
  id: string;
  credentialId: string;
  issuedAt: string;
  roadmap: {
    title: string;
    slug: string;
    category?: string | null;
    courseCount: number;
  };
};

type CertificateItem = CourseCertificateItem | RoadmapCertificateItem;

export function CertificatesWorkspace({
  studentName,
  certificates,
}: {
  studentName: string;
  certificates: CertificateItem[];
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function downloadPdf(cert: CertificateItem) {
    setDownloadingId(cert.id);
    setFlash(null);
    try {
      const urlPath =
        cert.kind === "roadmap"
          ? `/api/student/certificates/roadmap/${cert.id}/pdf`
          : `/api/student/certificates/${cert.id}/pdf`;
      const response = await fetch(urlPath);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not download certificate.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const title =
        cert.kind === "roadmap" ? cert.roadmap.title : cert.course.title;
      const filename =
        match?.[1] ??
        `${title.toLowerCase().replace(/\s+/g, "-")}-certificate.pdf`;

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setFlash(`Downloaded PDF certificate for “${title}”.`);
    } catch (error) {
      setFlash(
        error instanceof Error
          ? error.message
          : "Could not download certificate.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Certificates"
        subtitle="Course and roadmap credentials issued when you finish the work."
      />

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />

      {certificates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <Award className="mx-auto size-10 text-brand-purple/50" />
          <p className="mt-4 font-semibold text-brand-navy">No certificates yet</p>
          <p className="mt-1 text-sm text-muted">
            Finish a course or a full roadmap — certificates appear here
            automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {certificates.map((cert) => (
            <article
              key={`${cert.kind}-${cert.id}`}
              className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              {cert.kind === "course" ? (
                <CertificatePreview
                  studentName={studentName}
                  courseTitle={cert.course.title}
                  instructorName={cert.course.instructor.name}
                  category={cert.course.category}
                  issuedAt={cert.issuedAt}
                  credentialId={cert.credentialId}
                />
              ) : (
                <CertificatePreview
                  studentName={studentName}
                  courseTitle={cert.roadmap.title}
                  instructorName={`Roadmap · ${cert.roadmap.courseCount} courses`}
                  category={cert.roadmap.category ?? "Learning path"}
                  issuedAt={cert.issuedAt}
                  credentialId={cert.credentialId}
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-[#324361]">
                    {cert.kind === "roadmap" ? (
                      <Route className="size-3.5 shrink-0 text-brand-teal" />
                    ) : (
                      <Award className="size-3.5 shrink-0 text-brand-purple" />
                    )}
                    {cert.kind === "roadmap"
                      ? cert.roadmap.title
                      : cert.course.title}
                  </p>
                  <p className="text-xs text-muted">
                    {cert.kind === "roadmap"
                      ? `Path certificate · ${cert.roadmap.courseCount} courses`
                      : cert.course.instructor.name}{" "}
                    ·{" "}
                    {new Date(cert.issuedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadPdf(cert)}
                  disabled={downloadingId === cert.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#083f9b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-purple disabled:opacity-60"
                >
                  {downloadingId === cert.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  {downloadingId === cert.id ? "Generating…" : "Download PDF"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
