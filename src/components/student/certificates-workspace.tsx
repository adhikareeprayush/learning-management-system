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

function slugFilename(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "course"}-certificate.pdf`;
}

async function downloadFromServer(cert: CertificateItem, filename: string) {
  const urlPath =
    cert.kind === "roadmap"
      ? `/api/student/certificates/roadmap/${cert.id}/pdf`
      : `/api/student/certificates/${cert.id}/pdf`;
  const response = await fetch(`${urlPath}?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      data.error || `Download failed (${response.status}). Restart the dev server and try again.`,
    );
  }
  const blob = await response.blob();
  if (!blob.size || blob.type.includes("json")) {
    throw new Error("Server returned an empty certificate file.");
  }
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Capture the on-screen thumbnail so the PDF matches what you see. */
async function downloadFromPreview(root: HTMLElement, filename: string) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(root, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#F7F6F3",
    logging: false,
    // Avoid cloning issues with modern color functions
    onclone: (doc) => {
      doc.querySelectorAll<HTMLElement>("[data-certificate-root] *").forEach((el) => {
        const style = doc.defaultView?.getComputedStyle(el);
        if (!style) return;
        // Force hex-friendly colors for html2canvas
        if (style.color) el.style.color = style.color;
        if (style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)") {
          el.style.backgroundColor = style.backgroundColor;
        }
      });
    },
  });

  if (!canvas.width || !canvas.height) {
    throw new Error("Could not render certificate preview.");
  }

  const img = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
    compress: true,
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(img, "JPEG", 0, 0, pageW, pageH);
  pdf.save(filename);
}

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
    const title =
      cert.kind === "roadmap" ? cert.roadmap.title : cert.course.title;
    const filename = slugFilename(title);

    const preview = document.querySelector<HTMLElement>(
      `[data-certificate-id="${cert.id}"]`,
    );

    try {
      // Server PDF (pdf-lib) — reliable; includes full footer
      await downloadFromServer(cert, filename);
      setFlash(`Downloaded PDF certificate for “${title}”.`);
    } catch (serverError) {
      try {
        // Fallback: snapshot the on-screen certificate card
        if (!preview) throw serverError;
        await downloadFromPreview(preview, filename);
        setFlash(`Downloaded PDF certificate for “${title}”.`);
      } catch (fallbackError) {
        const message =
          serverError instanceof Error
            ? serverError.message
            : fallbackError instanceof Error
              ? fallbackError.message
              : "Could not download certificate.";
        setFlash(message);
      }
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
              className="rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              {cert.kind === "course" ? (
                <CertificatePreview
                  data-certificate-id={cert.id}
                  studentName={studentName}
                  courseTitle={cert.course.title}
                  instructorName={cert.course.instructor.name}
                  category={cert.course.category}
                  issuedAt={cert.issuedAt}
                  credentialId={cert.credentialId}
                />
              ) : (
                <CertificatePreview
                  data-certificate-id={cert.id}
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
