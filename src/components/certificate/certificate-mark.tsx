import type { CSSProperties } from "react";
import { CERTIFICATE, LOGO_MARK } from "@/lib/certificate-design";

type MarkColors = {
  navy?: string;
  teal?: string;
  edge?: string;
};

/** Mark shapes on the 48-unit grid, for embedding inside another SVG. */
export function LogoMarkShapes({
  navy = CERTIFICATE.navy,
  teal = CERTIFICATE.teal,
  edge = teal,
}: MarkColors) {
  return (
    <>
      <g
        stroke={edge}
        strokeWidth={LOGO_MARK.edgeWidth}
        opacity={LOGO_MARK.edgeOpacity}
      >
        {LOGO_MARK.edges.map(([x1, y1, x2, y2]) => (
          <line key={`${y1}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      {LOGO_MARK.nodes.map((node) => (
        <circle
          key={`${node.x}-${node.y}`}
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={node.tone === "navy" ? navy : teal}
        />
      ))}
    </>
  );
}

/** Convolution LMS logo mark — standalone for certificates (no link wrapper). */
export function CertificateMark({
  className = "size-10",
  style,
  ...colors
}: MarkColors & { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox={`0 0 ${LOGO_MARK.viewBox} ${LOGO_MARK.viewBox}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden
    >
      <LogoMarkShapes {...colors} />
    </svg>
  );
}
