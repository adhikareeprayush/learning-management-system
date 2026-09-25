/**
 * Shared certificate spec. The React preview and the pdf-lib renderer both
 * read from here so the on-screen card and the downloaded PDF stay in step.
 */
export const CERTIFICATE = {
  paper: "#F7F6F3",
  navy: "#04016C",
  teal: "#2AAA94",
  mint: "#4BE5CA",
  ink: "#324361",
  muted: "#6B7280",
  rule: "#D8D4CC",
} as const;

/**
 * Geometry in PDF points on an A4 landscape page, measured from the top-left.
 * The preview scales the same numbers to its container width.
 */
export const CERTIFICATE_LAYOUT = {
  page: { width: 842, height: 595 },
  frameOuter: 18,
  frameInner: 25,
  cornerNode: 3.2,
  contentWidth: 600,

  brandTop: 54,
  markSize: 30,
  wordmarkSize: 15,
  labelTop: 104,
  labelSize: 9,
  labelTracking: 3.4,

  /** Body is centred vertically between these two lines. */
  bodyTop: 124,
  bodyBottom: 444,
  supportSize: 15,
  nameSize: 46,
  nameMinSize: 32,
  titleSize: 19,
  titleMinSize: 15,
  metaSize: 8.5,
  metaTracking: 2.2,

  signatureBaseline: 486,
  signatureRuleGap: 9,
  signatureColumnWidth: 200,
  signatureOffset: 206,
  sealRadius: 38,
  sealCenter: 490,
  credentialBaseline: 550,
  smallSize: 7.5,
} as const;

export const CERTIFICATE_FONTS = {
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  brand: "'Sora', system-ui, sans-serif",
  ui: "'Saira', system-ui, sans-serif",
} as const;

/** Brand mark geometry: a 3 → 2 feed-forward layer on a 48-unit grid. */
export const LOGO_MARK = {
  viewBox: 48,
  /** Centre of the drawn nodes (the grid itself is 0–48). */
  center: { x: 24.25, y: 24 },
  /** Drawn width as a fraction of the grid, for optical alignment. */
  visualWidth: 34.5 / 48,
  edgeWidth: 1.6,
  edgeOpacity: 0.4,
  edges: [
    [11, 11, 37, 17.5],
    [11, 11, 37, 30.5],
    [11, 24, 37, 17.5],
    [11, 24, 37, 30.5],
    [11, 37, 37, 17.5],
    [11, 37, 37, 30.5],
  ],
  nodes: [
    { x: 11, y: 11, r: 4, tone: "navy" },
    { x: 11, y: 24, r: 4, tone: "navy" },
    { x: 11, y: 37, r: 4, tone: "navy" },
    { x: 37, y: 17.5, r: 4.5, tone: "teal" },
    { x: 37, y: 30.5, r: 4.5, tone: "teal" },
  ],
} as const;

/** Text that repeats around the seal ring. */
export const CERTIFICATE_SEAL_TEXT = "VERIFIED CREDENTIAL • CONVOLUTION LMS • ";

export type CertificateContent = {
  label: string;
  studentName: string;
  presentedLine: string;
  completingLine: string;
  title: string;
  meta: string | null;
  signatory: { name: string; role: string };
  issuedOn: string;
  credentialId: string;
};

export function formatCertificateDate(issuedAt: Date | string) {
  return new Date(issuedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    // Fixed zone keeps the server PDF and the hydrated preview identical.
    timeZone: "UTC",
  });
}

export function courseCertificateContent(input: {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  category?: string | null;
  credentialId: string;
  issuedAt: Date | string;
}): CertificateContent {
  return {
    label: "Certificate of Completion",
    studentName: input.studentName,
    presentedLine: "This is to certify that",
    completingLine: "has successfully completed the course",
    title: input.courseTitle,
    meta: input.category?.trim() || null,
    signatory: { name: input.instructorName, role: "Course instructor" },
    issuedOn: formatCertificateDate(input.issuedAt),
    credentialId: input.credentialId,
  };
}

export function roadmapCertificateContent(input: {
  studentName: string;
  roadmapTitle: string;
  courseCount: number;
  category?: string | null;
  credentialId: string;
  issuedAt: Date | string;
}): CertificateContent {
  const courses = `${input.courseCount} course${input.courseCount === 1 ? "" : "s"}`;
  return {
    label: "Learning Path Certificate",
    studentName: input.studentName,
    presentedLine: "This is to certify that",
    completingLine: "has successfully completed the learning path",
    title: input.roadmapTitle,
    meta: [courses, input.category?.trim()].filter(Boolean).join(" · "),
    signatory: { name: "Convolution LMS", role: "Issuing institute" },
    issuedOn: formatCertificateDate(input.issuedAt),
    credentialId: input.credentialId,
  };
}
