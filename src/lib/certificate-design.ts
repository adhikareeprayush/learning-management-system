/** Shared certificate palette + spacing (formal award layout). */
export const CERTIFICATE = {
  paper: "#F7F6F3",
  paperEdge: "#E8E6E1",
  navy: "#04016C",
  blue: "#083F9B",
  teal: "#2AAA94",
  mint: "#4BE5CA",
  ink: "#324361",
  muted: "#6B7280",
  rule: "#D8D4CC",
} as const;

/**
 * Spacing follows common award-certificate practice:
 * generous margins, clear header / body / signature bands,
 * and the recipient name as the dominant element.
 * @see CertSeal, VerifyEd, SendCertificates design guides
 */
export const CERTIFICATE_LAYOUT = {
  /** A4 landscape points */
  page: { width: 842, height: 595 },
  margin: 52,
  frameOuter: 26,
  frameInner: 40,
  /** Vertical rhythm (pt) between major bands */
  afterHeader: 36,
  afterPresented: 30,
  afterName: 14,
  afterCompleting: 16,
  beforeFooter: 44,
  footerToCredential: 28,
  nameSize: 36,
  titleSize: 18,
  labelSize: 10,
  supportSize: 12,
} as const;
