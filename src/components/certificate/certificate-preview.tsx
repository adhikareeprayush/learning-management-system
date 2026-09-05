"use client";

import { forwardRef } from "react";
import { CERTIFICATE } from "@/lib/certificate-design";
import { CertificateMark } from "@/components/certificate/certificate-mark";

type CertificatePreviewProps = {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  category?: string | null;
  issuedAt: string;
  credentialId: string;
  "data-certificate-id"?: string;
  exportMode?: boolean;
};

function CornerBracket({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute size-5 border-[#04016C]/35 ${className}`}
      aria-hidden
    />
  );
}

/**
 * Formal certificate layout:
 * issuer header → credential label → recipient (dominant) → achievement →
 * signature / seal / date band → verification id
 * with intentional whitespace between bands.
 */
export const CertificatePreview = forwardRef<
  HTMLDivElement,
  CertificatePreviewProps
>(function CertificatePreview(
  {
    studentName,
    courseTitle,
    instructorName,
    category,
    issuedAt,
    credentialId,
    exportMode = false,
    "data-certificate-id": certificateDomId,
  },
  ref,
) {
  const issued = new Date(issuedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      ref={ref}
      data-certificate-root
      data-certificate-id={certificateDomId}
      className={
        exportMode
          ? "relative box-border overflow-hidden"
          : "relative aspect-[1.414/1] min-h-[300px]"
      }
      style={{
        backgroundColor: CERTIFICATE.paper,
        color: CERTIFICATE.ink,
        ...(exportMode
          ? {
              width: 842,
              height: 595,
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
            }
          : null),
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <div
        className={`absolute border border-[#04016C]/20 ${
          exportMode ? "" : "inset-3 sm:inset-4"
        }`}
        style={exportMode ? { inset: 22 } : undefined}
      />
      <div
        className={`absolute border border-[#2AAA94]/25 ${
          exportMode ? "" : "inset-[14px] sm:inset-[20px]"
        }`}
        style={exportMode ? { inset: 38 } : undefined}
      />

      <CornerBracket className="left-3 top-3 border-l-2 border-t-2 sm:left-4 sm:top-4" />
      <CornerBracket className="right-3 top-3 border-r-2 border-t-2 sm:right-4 sm:top-4" />
      <CornerBracket className="bottom-3 left-3 border-b-2 border-l-2 sm:bottom-4 sm:left-4" />
      <CornerBracket className="right-3 bottom-3 border-b-2 border-r-2 sm:bottom-4 sm:right-4" />

      <div
        className={
          exportMode
            ? "relative flex h-full flex-col"
            : "relative flex h-full flex-col px-6 py-5 sm:px-9 sm:py-7"
        }
        style={exportMode ? { padding: "44px 64px 36px" } : undefined}
      >
        {/* ── Band 1: Issuer ── */}
        <header className="flex shrink-0 flex-col items-center">
          <div className={`flex items-center ${exportMode ? "gap-3" : "gap-2.5"}`}>
            <CertificateMark
              className={exportMode ? "size-10" : "size-8 sm:size-9"}
            />
            <span
              className={`font-brand leading-none ${
                exportMode ? "text-[22px]" : "text-lg sm:text-xl"
              }`}
              style={{ color: CERTIFICATE.navy }}
            >
              Edu<span style={{ color: CERTIFICATE.teal }}>jarr</span>
            </span>
          </div>

          <div
            className={`w-full max-w-[200px] border-t ${
              exportMode ? "mt-5" : "mt-3 sm:mt-4"
            }`}
            style={{ borderColor: CERTIFICATE.rule }}
          />

          <p
            className={`font-sans font-semibold uppercase tracking-[0.32em] ${
              exportMode
                ? "mt-4 text-[11px]"
                : "mt-3 text-[8px] sm:mt-3.5 sm:text-[10px]"
            }`}
            style={{ color: CERTIFICATE.navy }}
          >
            Certificate of Completion
          </p>

          <div
            className={`flex items-center gap-2.5 ${
              exportMode ? "mt-4" : "mt-2.5 sm:mt-3"
            }`}
          >
            <span
              className={exportMode ? "h-px w-16" : "h-px w-10 sm:w-14"}
              style={{ backgroundColor: CERTIFICATE.rule }}
            />
            <span
              className={`rotate-45 border ${
                exportMode ? "size-1.5" : "size-1 sm:size-1.5"
              }`}
              style={{
                borderColor: `${CERTIFICATE.teal}99`,
                backgroundColor: `${CERTIFICATE.teal}1a`,
              }}
            />
            <span
              className={exportMode ? "h-px w-16" : "h-px w-10 sm:w-14"}
              style={{ backgroundColor: CERTIFICATE.rule }}
            />
          </div>
        </header>

        {/* ── Band 2: Recipient + achievement (optical center) ── */}
        <div
          className={`flex min-h-0 flex-1 flex-col items-center justify-center text-center ${
            exportMode ? "gap-0 px-8" : "gap-0"
          }`}
        >
          <p
            className={
              exportMode ? "text-[13px]" : "text-[10px] sm:text-xs"
            }
            style={{
              color: CERTIFICATE.muted,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
            }}
          >
            This certifies that
          </p>

          <p
            className={`line-clamp-2 font-display leading-[1.15] ${
              exportMode
                ? "mt-3.5 text-[40px]"
                : "mt-2 text-[1.35rem] sm:mt-2.5 sm:text-3xl"
            }`}
            style={{ color: CERTIFICATE.navy }}
          >
            {studentName}
          </p>

          <div
            className={`flex flex-col items-center gap-0.5 ${
              exportMode ? "mt-1.5" : "mt-1.5 sm:mt-2"
            }`}
          >
            <span
              className={exportMode ? "h-px w-44" : "h-px w-28 sm:w-40"}
              style={{ backgroundColor: "rgba(4,1,108,0.22)" }}
            />
            <span
              className={exportMode ? "h-px w-32" : "h-px w-20 sm:w-28"}
              style={{ backgroundColor: `${CERTIFICATE.teal}66` }}
            />
          </div>

          <p
            className={
              exportMode
                ? "mt-2.5 text-[13px]"
                : "mt-2 text-[10px] sm:mt-2.5 sm:text-xs"
            }
            style={{
              color: CERTIFICATE.muted,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
            }}
          >
            has successfully completed
          </p>

          <p
            className={`line-clamp-3 max-w-[36ch] break-words font-semibold leading-snug ${
              exportMode
                ? "mt-3 text-[20px]"
                : "mt-2 text-sm sm:mt-2.5 sm:text-lg"
            }`}
            style={{ color: CERTIFICATE.ink }}
          >
            {courseTitle}
          </p>

          {category ? (
            <p
              className={`font-medium uppercase tracking-[0.2em] ${
                exportMode
                  ? "mt-3 text-[11px]"
                  : "mt-2 text-[8px] sm:mt-2.5 sm:text-[10px]"
              }`}
              style={{ color: CERTIFICATE.teal }}
            >
              {category}
            </p>
          ) : null}
        </div>

        {/* ── Band 3: Signatures + seal (no full-width line through seal) ── */}
        <footer
          className={`shrink-0 ${
            exportMode ? "mt-8 pt-2" : "mt-5 pt-1 sm:mt-6"
          }`}
        >
          <div
            className={`grid grid-cols-3 items-end ${
              exportMode
                ? "gap-10 text-[11px]"
                : "gap-5 text-[8px] sm:gap-6 sm:text-[10px]"
            }`}
          >
            <div className="min-w-0 text-left">
              <div
                className={exportMode ? "mb-3 border-b pb-1.5" : "mb-2 border-b pb-1"}
                style={{ borderColor: CERTIFICATE.rule }}
              />
              <p
                className="truncate font-semibold"
                style={{ color: CERTIFICATE.ink }}
              >
                {instructorName}
              </p>
              <p className="mt-1" style={{ color: CERTIFICATE.muted }}>
                Course instructor
              </p>
            </div>

            <div className="flex flex-col items-center pb-0.5">
              <div
                className={`grid place-items-center rounded-full border-2 bg-white ${
                  exportMode ? "size-16" : "size-11 sm:size-12"
                }`}
                style={{ borderColor: `${CERTIFICATE.teal}80` }}
              >
                <CertificateMark
                  className={exportMode ? "size-8" : "size-5 sm:size-6"}
                />
              </div>
              <p
                className={`font-medium uppercase tracking-[0.18em] ${
                  exportMode ? "mt-2.5 text-[9px]" : "mt-1.5 text-[7px] sm:text-[8px]"
                }`}
                style={{ color: CERTIFICATE.teal }}
              >
                Verified
              </p>
            </div>

            <div className="min-w-0 text-right">
              <div
                className={exportMode ? "mb-3 border-b pb-1.5" : "mb-2 border-b pb-1"}
                style={{ borderColor: CERTIFICATE.rule }}
              />
              <p className="font-semibold" style={{ color: CERTIFICATE.ink }}>
                {issued}
              </p>
              <p className="mt-1" style={{ color: CERTIFICATE.muted }}>
                Date issued
              </p>
            </div>
          </div>

          <p
            className={`text-center font-mono tracking-wide ${
              exportMode
                ? "mt-5 text-[10px]"
                : "mt-3 text-[7px] sm:mt-3.5 sm:text-[9px]"
            }`}
            style={{ color: `${CERTIFICATE.muted}b3` }}
          >
            Credential ID · {credentialId}
          </p>
        </footer>
      </div>
    </div>
  );
});
