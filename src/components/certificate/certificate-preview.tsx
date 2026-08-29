import { CERTIFICATE } from "@/lib/certificate-design";
import { CertificateMark } from "@/components/certificate/certificate-mark";

type CertificatePreviewProps = {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  category?: string | null;
  issuedAt: string;
  credentialId: string;
  compact?: boolean;
};

function CornerBracket({
  className,
}: {
  className: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute size-5 border-brand-navy/35 ${className}`}
      aria-hidden
    />
  );
}

export function CertificatePreview({
  studentName,
  courseTitle,
  instructorName,
  category,
  issuedAt,
  credentialId,
  compact = false,
}: CertificatePreviewProps) {
  const issued = new Date(issuedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`relative overflow-hidden ${
        compact ? "aspect-[1.42/1]" : "aspect-[1.42/1] min-h-[220px]"
      }`}
      style={{ backgroundColor: CERTIFICATE.paper }}
    >
      {/* Paper grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      {/* Outer frame */}
      <div
        className={`absolute inset-0 border border-[#04016C]/20 ${
          compact ? "m-2" : "m-3 sm:m-4"
        }`}
      />
      <div
        className={`absolute border border-[#2AAA94]/30 ${
          compact ? "inset-[10px]" : "inset-[14px] sm:inset-[18px]"
        }`}
      />

      <CornerBracket className="left-3 top-3 border-l-2 border-t-2" />
      <CornerBracket className="right-3 top-3 border-r-2 border-t-2" />
      <CornerBracket className="bottom-3 left-3 border-b-2 border-l-2" />
      <CornerBracket className="right-3 bottom-3 border-b-2 border-r-2" />

      <div
        className={`relative flex h-full flex-col ${
          compact ? "px-4 py-3" : "px-6 py-5 sm:px-8 sm:py-6"
        }`}
      >
        {/* Header — logo + wordmark */}
        <header className="flex shrink-0 flex-col items-center">
          <div className="flex items-center gap-2.5">
            <CertificateMark
              className={compact ? "size-7" : "size-9 sm:size-10"}
            />
            <span
              className={`font-brand leading-none text-brand-navy ${
                compact ? "text-lg" : "text-xl sm:text-2xl"
              }`}
            >
              Edu<span className="text-brand-teal">jarr</span>
            </span>
          </div>

          <div
            className={`mt-2 w-full max-w-[280px] border-t ${
              compact ? "mt-1.5" : "mt-2.5"
            }`}
            style={{ borderColor: CERTIFICATE.rule }}
          />

          <p
            className={`mt-2 font-sans font-semibold uppercase tracking-[0.28em] text-brand-navy/80 ${
              compact ? "text-[7px]" : "text-[9px] sm:text-[10px]"
            }`}
          >
            Certificate of Completion
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span
              className="h-px w-10 sm:w-14"
              style={{ backgroundColor: CERTIFICATE.rule }}
            />
            <span
              className={`rotate-45 border border-brand-teal/60 bg-brand-teal/10 ${
                compact ? "size-1" : "size-1.5"
              }`}
            />
            <span
              className="h-px w-10 sm:w-14"
              style={{ backgroundColor: CERTIFICATE.rule }}
            />
          </div>
        </header>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <p
            className={`text-muted ${compact ? "text-[8px]" : "text-[11px] sm:text-xs"}`}
          >
            Presented to
          </p>
          <p
            className={`mt-1 font-display leading-tight text-brand-navy ${
              compact ? "text-sm" : "text-xl sm:text-2xl"
            }`}
          >
            {studentName}
          </p>
          <div
            className={`mt-1 flex flex-col items-center gap-0.5 ${
              compact ? "mt-0.5" : "mt-1.5"
            }`}
          >
            <span
              className={`h-px bg-brand-navy/25 ${compact ? "w-16" : "w-28 sm:w-36"}`}
            />
            <span
              className={`h-px bg-brand-teal/40 ${compact ? "w-12" : "w-20 sm:w-28"}`}
            />
          </div>

          <p
            className={`mt-2 text-muted ${compact ? "mt-1 text-[8px]" : "mt-3 text-[11px] sm:text-xs"}`}
          >
            for successfully completing
          </p>
          <p
            className={`mt-1 font-semibold leading-snug text-[#324361] ${
              compact
                ? "line-clamp-2 text-[9px]"
                : "line-clamp-3 break-words text-sm sm:text-base"
            }`}
          >
            {courseTitle}
          </p>
          {category ? (
            <p
              className={`mt-1 font-medium uppercase tracking-widest text-brand-teal ${
                compact ? "text-[7px]" : "text-[9px]"
              }`}
            >
              {category}
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <footer className="shrink-0">
          <div
            className={`grid items-end gap-2 ${
              compact ? "grid-cols-3 text-[7px]" : "grid-cols-3 text-[9px] sm:text-[10px]"
            }`}
          >
            <div className="text-left">
              <div
                className="mb-1 border-b border-brand-navy/25 pb-0.5"
                style={{ borderColor: CERTIFICATE.rule }}
              />
              <p className="truncate font-semibold text-[#324361]">
                {instructorName}
              </p>
              <p className="text-muted">Course instructor</p>
            </div>

            <div className="flex flex-col items-center">
              <div
                className={`grid place-items-center rounded-full border-2 border-brand-teal/50 bg-white shadow-sm ${
                  compact ? "size-9" : "size-11 sm:size-12"
                }`}
              >
                <CertificateMark
                  className={compact ? "size-4" : "size-5 sm:size-6"}
                />
              </div>
              <p className="mt-1 text-[8px] font-medium uppercase tracking-wider text-muted">
                Verified
              </p>
            </div>

            <div className="text-right">
              <div
                className="mb-1 border-b border-brand-navy/25 pb-0.5"
                style={{ borderColor: CERTIFICATE.rule }}
              />
              <p className="font-semibold text-[#324361]">{issued}</p>
              <p className="text-muted">Date issued</p>
            </div>
          </div>

          <p
            className={`mt-2 text-center font-mono text-muted/80 ${
              compact ? "text-[6px]" : "text-[8px] sm:text-[9px]"
            }`}
          >
            {credentialId}
          </p>
        </footer>
      </div>
    </div>
  );
}
