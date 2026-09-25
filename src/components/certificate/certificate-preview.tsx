import type { CSSProperties } from "react";
import {
  CERTIFICATE,
  CERTIFICATE_FONTS,
  CERTIFICATE_LAYOUT as L,
  CERTIFICATE_SEAL_TEXT,
  LOGO_MARK,
  type CertificateContent,
} from "@/lib/certificate-design";
import {
  CertificateMark,
  LogoMarkShapes,
} from "@/components/certificate/certificate-mark";

type CertificatePreviewProps = {
  content: CertificateContent;
  "data-certificate-id"?: string;
};

/** Length in PDF points, scaled to the rendered width of the certificate. */
const u = (points: number) => `calc(var(--cert-unit) * ${points})`;
/** Hairlines stay visible when the card is small. */
const hairline = (points: number) => `max(1px, ${u(points)})`;

const CX = L.page.width / 2;

/**
 * The browser has no access to pdf-lib's font metrics, so approximate the
 * PDF's shrink-to-fit with average glyph widths for each face.
 */
function fittedSize(text: string, max: number, min: number, width: number, em: number) {
  return Math.max(min, Math.min(max, width / (Math.max(text.length, 1) * em)));
}

/**
 * A4 landscape certificate drawn on the same point grid as the PDF
 * (lib/certificate-pdf.ts), scaled to the container width.
 */
export function CertificatePreview({
  content,
  "data-certificate-id": certificateDomId,
}: CertificatePreviewProps) {
  const nameSize = fittedSize(content.studentName, L.nameSize, L.nameMinSize, L.contentWidth, 0.43);
  const titleSize = fittedSize(content.title, L.titleSize, L.titleMinSize, L.contentWidth - 40, 0.55);
  const signatureSize = (text: string) => fittedSize(text, 18, 13, L.signatureColumnWidth, 0.4);

  const columns = [
    { x: CX - L.signatureOffset, ...content.signatory },
    { x: CX + L.signatureOffset, name: content.issuedOn, role: "Date issued" },
  ];

  const smallCaps: CSSProperties = {
    fontFamily: CERTIFICATE_FONTS.ui,
    fontWeight: 600,
    textTransform: "uppercase",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  return (
    <div
      data-certificate-root
      data-certificate-id={certificateDomId}
      role="img"
      aria-label={`${content.label}: ${content.studentName}, ${content.title}`}
      className="relative w-full select-none overflow-hidden"
      style={{
        aspectRatio: `${L.page.width} / ${L.page.height}`,
        backgroundColor: CERTIFICATE.paper,
        containerType: "inline-size",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ "--cert-unit": `calc(100cqw / ${L.page.width})` } as CSSProperties}
      >
        {/* Frame */}
        <div
          className="absolute"
          style={{ inset: u(L.frameOuter), border: `${hairline(0.9)} solid ${CERTIFICATE.navy}` }}
        />
        <div
          className="absolute"
          style={{
            inset: u(L.frameInner),
            border: `${hairline(0.45)} solid ${CERTIFICATE.teal}b3`,
          }}
        />
        {[
          { left: L.frameOuter, top: L.frameOuter },
          { left: L.page.width - L.frameOuter, top: L.frameOuter },
          { left: L.frameOuter, top: L.page.height - L.frameOuter },
          { left: L.page.width - L.frameOuter, top: L.page.height - L.frameOuter },
        ].map((corner) => (
          <span
            key={`${corner.left}-${corner.top}`}
            className="absolute grid place-items-center rounded-full"
            style={{
              left: u(corner.left - L.cornerNode),
              top: u(corner.top - L.cornerNode),
              width: u(L.cornerNode * 2),
              height: u(L.cornerNode * 2),
              backgroundColor: CERTIFICATE.navy,
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: u(L.cornerNode * 0.8),
                height: u(L.cornerNode * 0.8),
                backgroundColor: CERTIFICATE.mint,
              }}
            />
          </span>
        ))}

        {/* Issuer */}
        <div
          className="absolute inset-x-0 flex items-center justify-center"
          style={{ top: u(L.brandTop), transform: "translateY(-50%)", gap: u(4) }}
        >
          <CertificateMark
            className="shrink-0"
            style={{ width: u(L.markSize), height: u(L.markSize) }}
          />
          <span
            style={{
              fontFamily: CERTIFICATE_FONTS.brand,
              fontWeight: 600,
              fontSize: u(L.wordmarkSize),
              lineHeight: 1,
              color: CERTIFICATE.navy,
              whiteSpace: "nowrap",
            }}
          >
            Convolution<span style={{ color: CERTIFICATE.teal }}> LMS</span>
          </span>
        </div>

        <div
          className="absolute inset-x-0 flex items-center justify-center"
          style={{ top: u(L.labelTop - L.labelSize * 0.84), gap: u(14) }}
        >
          <span style={{ width: u(44), height: hairline(0.6), backgroundColor: CERTIFICATE.teal }} />
          <span
            style={{
              ...smallCaps,
              fontSize: u(L.labelSize),
              letterSpacing: u(L.labelTracking),
              marginRight: `calc(-1 * ${u(L.labelTracking)})`,
              color: CERTIFICATE.navy,
            }}
          >
            {content.label}
          </span>
          <span style={{ width: u(44), height: hairline(0.6), backgroundColor: CERTIFICATE.teal }} />
        </div>

        {/* Recipient and achievement, centred between header and footer */}
        <div
          className="absolute inset-x-0 flex flex-col items-center justify-center text-center"
          style={{ top: u(L.bodyTop), height: u(L.bodyBottom - L.bodyTop) }}
        >
          <p
            className="shrink-0"
            style={{
              fontFamily: CERTIFICATE_FONTS.serif,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: u(L.supportSize),
              lineHeight: 1,
              color: CERTIFICATE.muted,
            }}
          >
            {content.presentedLine}
          </p>
          <p
            className="line-clamp-2 shrink-0 break-words"
            style={{
              marginTop: u(10),
              maxWidth: u(L.contentWidth),
              fontFamily: CERTIFICATE_FONTS.serif,
              fontWeight: 600,
              fontSize: u(nameSize),
              lineHeight: 1.08,
              color: CERTIFICATE.navy,
            }}
          >
            {content.studentName}
          </p>
          <div
            className="relative flex shrink-0 items-center"
            style={{ marginTop: u(4), width: u(300), height: u(6) }}
            aria-hidden
          >
            {[-1, 1].map((dir) => (
              <span
                key={dir}
                className="absolute"
                style={{
                  [dir < 0 ? "right" : "left"]: u(159),
                  width: u(141),
                  height: hairline(0.6),
                  backgroundColor: `${CERTIFICATE.navy}4d`,
                }}
              />
            ))}
            {[
              { left: 0, r: 1.3 },
              { left: 150, r: 2.6 },
              { left: 300, r: 1.3 },
            ].map((dot) => (
              <span
                key={dot.left}
                className="absolute rounded-full"
                style={{
                  left: u(dot.left - dot.r),
                  width: u(dot.r * 2),
                  height: u(dot.r * 2),
                  backgroundColor: CERTIFICATE.teal,
                }}
              />
            ))}
          </div>
          <p
            className="shrink-0"
            style={{
              marginTop: u(14),
              fontFamily: CERTIFICATE_FONTS.serif,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: u(L.supportSize),
              lineHeight: 1,
              color: CERTIFICATE.muted,
            }}
          >
            {content.completingLine}
          </p>
          <p
            className="line-clamp-2 shrink-0 break-words"
            style={{
              marginTop: u(12),
              maxWidth: u(L.contentWidth - 40),
              fontFamily: CERTIFICATE_FONTS.brand,
              fontWeight: 600,
              fontSize: u(titleSize),
              lineHeight: 1.32,
              color: CERTIFICATE.ink,
            }}
          >
            {content.title}
          </p>
          {content.meta ? (
            <p
              className="shrink-0"
              style={{
                ...smallCaps,
                marginTop: u(13),
                fontSize: u(L.metaSize),
                letterSpacing: u(L.metaTracking),
                color: CERTIFICATE.teal,
              }}
            >
              {content.meta}
            </p>
          ) : null}
        </div>

        {/* Signatures */}
        {columns.map((column) => (
          <div
            key={column.role}
            className="absolute flex flex-col items-center"
            style={{
              left: u(column.x - L.signatureColumnWidth / 2),
              width: u(L.signatureColumnWidth),
              top: u(L.signatureBaseline - 18),
            }}
          >
            <p
              className="w-full truncate text-center"
              style={{
                fontFamily: CERTIFICATE_FONTS.serif,
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: u(signatureSize(column.name)),
                lineHeight: `${u(22)}`,
                color: CERTIFICATE.navy,
              }}
            >
              {column.name}
            </p>
            <span
              className="w-full"
              style={{
                marginTop: u(L.signatureRuleGap - 4),
                height: hairline(0.6),
                backgroundColor: `${CERTIFICATE.navy}59`,
              }}
            />
            <p
              style={{
                ...smallCaps,
                marginTop: u(8),
                fontSize: u(L.smallSize),
                letterSpacing: u(1.8),
                color: CERTIFICATE.muted,
              }}
            >
              {column.role}
            </p>
          </div>
        ))}

        <CertificateSeal ringId={`seal-ring-${content.credentialId}`} />

        {/* Credential */}
        <p
          className="absolute inset-x-0 flex justify-center"
          style={{ top: u(L.credentialBaseline - L.smallSize * 0.9), gap: u(10), lineHeight: 1 }}
        >
          <span
            style={{
              ...smallCaps,
              fontSize: u(L.smallSize),
              letterSpacing: u(1.8),
              color: CERTIFICATE.muted,
            }}
          >
            Credential ID
          </span>
          <span
            style={{
              fontFamily: CERTIFICATE_FONTS.ui,
              fontWeight: 500,
              fontSize: u(L.smallSize + 0.5),
              letterSpacing: u(0.6),
              color: CERTIFICATE.ink,
            }}
          >
            {content.credentialId}
          </span>
        </p>
      </div>
    </div>
  );
}

function CertificateSeal({ ringId }: { ringId: string }) {
  const r = L.sealRadius;
  const textRadius = r - 10;
  const firstPhrase = CERTIFICATE_SEAL_TEXT.indexOf(" • ");
  // Centre the first phrase over 12 o'clock, as in the PDF.
  const startAngle = -((firstPhrase / CERTIFICATE_SEAL_TEXT.length) * 360) / 2;
  const markScale = 30 / LOGO_MARK.viewBox;

  return (
    <svg
      viewBox={`${-r} ${-r} ${r * 2} ${r * 2}`}
      className="absolute"
      style={{
        left: u(CX - r),
        top: u(L.sealCenter - r),
        width: u(r * 2),
        height: u(r * 2),
      }}
      aria-hidden
    >
      <defs>
        <path
          id={ringId}
          d={`M 0 ${-textRadius} A ${textRadius} ${textRadius} 0 1 1 0 ${textRadius} A ${textRadius} ${textRadius} 0 1 1 0 ${-textRadius}`}
        />
      </defs>
      <circle r={r} fill={CERTIFICATE.navy} />
      <circle r={r - 2.5} fill="none" stroke={CERTIFICATE.mint} strokeOpacity={0.7} strokeWidth={0.5} />
      <circle r={r - 13} fill="none" stroke={CERTIFICATE.mint} strokeOpacity={0.7} strokeWidth={0.5} />
      <text
        transform={`rotate(${startAngle})`}
        fill="#ffffff"
        style={{ fontFamily: CERTIFICATE_FONTS.ui, fontWeight: 600, fontSize: 5.4 }}
      >
        <textPath
          href={`#${ringId}`}
          textLength={2 * Math.PI * textRadius - 1}
          lengthAdjust="spacing"
        >
          {CERTIFICATE_SEAL_TEXT}
        </textPath>
      </text>
      <g
        transform={`translate(${0.5 - LOGO_MARK.center.x * markScale} ${-LOGO_MARK.center.y * markScale}) scale(${markScale})`}
      >
        <LogoMarkShapes navy="#ffffff" teal={CERTIFICATE.mint} edge={CERTIFICATE.mint} />
      </g>
    </svg>
  );
}
