import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFName,
  PDFString,
  degrees,
  rgb,
  setCharacterSpacing,
  type Color,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import {
  CERTIFICATE,
  CERTIFICATE_LAYOUT as L,
  CERTIFICATE_SEAL_TEXT,
  LOGO_MARK,
  courseCertificateContent,
  roadmapCertificateContent,
  verifyUrlLabel,
  type CertificateContent,
} from "@/lib/certificate-design";

export type CertificatePdfInput = {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  category?: string | null;
  credentialId: string;
  issuedAt: Date;
  verifyUrl: string;
};

export type RoadmapCertificatePdfInput = {
  studentName: string;
  roadmapTitle: string;
  courseCount: number;
  category?: string | null;
  credentialId: string;
  issuedAt: Date;
  verifyUrl: string;
};

function hex(value: string) {
  const n = Number.parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export const COLOR = {
  paper: hex(CERTIFICATE.paper),
  navy: hex(CERTIFICATE.navy),
  teal: hex(CERTIFICATE.teal),
  mint: hex(CERTIFICATE.mint),
  ink: hex(CERTIFICATE.ink),
  muted: hex(CERTIFICATE.muted),
  white: rgb(1, 1, 1),
};

// Vendored so Vercel's file tracing ships them with the PDF routes
// (see outputFileTracingIncludes in next.config.ts).
const FONT_DIR = path.join(process.cwd(), "assets", "certificate-fonts");
const FONT_FILES = {
  serif: "cormorant-garamond-latin-600-normal.woff",
  serifItalic: "cormorant-garamond-latin-500-italic.woff",
  brand: "sora-latin-600-normal.woff",
  ui: "saira-latin-500-normal.woff",
  uiBold: "saira-latin-600-normal.woff",
} as const;

type FontKey = keyof typeof FONT_FILES;
export type Fonts = Record<FontKey, PDFFont>;

let cachedFontBytes: Record<FontKey, Uint8Array> | null = null;

function loadFontBytes() {
  if (!cachedFontBytes) {
    const bytes = {} as Record<FontKey, Uint8Array>;
    for (const key of Object.keys(FONT_FILES) as FontKey[]) {
      bytes[key] = fs.readFileSync(path.join(FONT_DIR, FONT_FILES[key]));
    }
    cachedFontBytes = bytes;
  }
  return cachedFontBytes;
}

const H = L.page.height;
const CX = L.page.width / 2;

/** The embedded fonts are Latin subsets: fold accents, drop what's left over. */
export function fit(text: string, font: PDFFont) {
  const supported = new Set(font.getCharacterSet());
  const has = (ch: string) => supported.has(ch.codePointAt(0)!);
  // Intl output (currency, times) uses no-break spaces the subsets lack.
  return [...text.replace(/[\u00a0\u202f]/g, " ")]
    .map((ch) => {
      if (has(ch)) return ch;
      const folded = ch.normalize("NFD").replace(/\p{M}/gu, "");
      return [...folded].every(has) ? folded : "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function textWidth(text: string, font: PDFFont, size: number, tracking = 0) {
  return (
    font.widthOfTextAtSize(text, size) +
    tracking * Math.max(0, [...text].length - 1)
  );
}

type TextOptions = {
  x: number;
  /** Baseline, measured from the top of the page. */
  baseline: number;
  font: PDFFont;
  size: number;
  color: Color;
  align?: "left" | "center" | "right";
  tracking?: number;
};

/** Draws text and returns its width. */
export function drawText(page: PDFPage, text: string, options: TextOptions) {
  const { x, baseline, font, size, color, align = "left", tracking = 0 } =
    options;
  const width = textWidth(text, font, size, tracking);
  const startX =
    align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  if (tracking) page.pushOperators(setCharacterSpacing(tracking));
  page.drawText(text, {
    x: startX,
    y: page.getHeight() - baseline,
    size,
    font,
    color,
  });
  if (tracking) page.pushOperators(setCharacterSpacing(0));
  return width;
}

export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  // Overflow: pack the remainder into the last line and trim by character.
  const kept = lines.slice(0, maxLines - 1);
  let last = lines.slice(maxLines - 1).join(" ");
  while (last.length > 1 && font.widthOfTextAtSize(`${last}…`, size) > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  kept.push(`${last}…`);
  return kept;
}

/** Shrink toward `minSize` to keep one line; wrap only if that isn't enough. */
function fitLines(
  text: string,
  font: PDFFont,
  maxSize: number,
  minSize: number,
  maxWidth: number,
  maxLines: number,
) {
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) {
      return { size, lines: [text] };
    }
  }
  return {
    size: minSize,
    lines: wrapText(text, font, minSize, maxWidth, maxLines),
  };
}

/** Brand mark (see LOGO_MARK), centred on (cx, cy) with cy from the top. */
export function drawMark(
  page: PDFPage,
  cx: number,
  cy: number,
  size: number,
  colors: { navy: Color; teal: Color; edge: Color },
  opacity = 1,
) {
  const s = size / LOGO_MARK.viewBox;
  const height = page.getHeight();
  const px = (x: number) => cx + (x - LOGO_MARK.center.x) * s;
  const py = (y: number) => height - (cy + (y - LOGO_MARK.center.y) * s);

  for (const [x1, y1, x2, y2] of LOGO_MARK.edges) {
    page.drawLine({
      start: { x: px(x1), y: py(y1) },
      end: { x: px(x2), y: py(y2) },
      thickness: LOGO_MARK.edgeWidth * s,
      color: colors.edge,
      opacity: LOGO_MARK.edgeOpacity * opacity,
    });
  }
  for (const node of LOGO_MARK.nodes) {
    page.drawCircle({
      x: px(node.x),
      y: py(node.y),
      size: node.r * s,
      color: node.tone === "navy" ? colors.navy : colors.teal,
      opacity,
    });
  }
}

function drawFrame(page: PDFPage) {
  const { width, height } = L.page;
  page.drawRectangle({ x: 0, y: 0, width, height, color: COLOR.paper });

  page.drawRectangle({
    x: L.frameOuter,
    y: L.frameOuter,
    width: width - L.frameOuter * 2,
    height: height - L.frameOuter * 2,
    borderColor: COLOR.navy,
    borderWidth: 0.9,
  });
  page.drawRectangle({
    x: L.frameInner,
    y: L.frameInner,
    width: width - L.frameInner * 2,
    height: height - L.frameInner * 2,
    borderColor: COLOR.teal,
    borderWidth: 0.45,
    borderOpacity: 0.7,
  });

  // Network nodes pinned to each corner of the outer frame.
  for (const x of [L.frameOuter, width - L.frameOuter]) {
    for (const y of [L.frameOuter, height - L.frameOuter]) {
      page.drawCircle({ x, y, size: L.cornerNode, color: COLOR.navy });
      page.drawCircle({ x, y, size: L.cornerNode * 0.4, color: COLOR.mint });
    }
  }
}

function drawHeader(page: PDFPage, fonts: Fonts, label: string) {
  const markVisual = L.markSize * LOGO_MARK.visualWidth;
  const gap = 9;
  const first = "Convolution";
  const second = " LMS";
  const firstW = fonts.brand.widthOfTextAtSize(first, L.wordmarkSize);
  const groupW =
    markVisual + gap + firstW + fonts.brand.widthOfTextAtSize(second, L.wordmarkSize);
  const left = CX - groupW / 2;

  drawMark(page, left + markVisual / 2, L.brandTop, L.markSize, {
    navy: COLOR.navy,
    teal: COLOR.teal,
    edge: COLOR.teal,
  });
  const baseline = L.brandTop + L.wordmarkSize * 0.36;
  const textX = left + markVisual + gap;
  drawText(page, first, {
    x: textX,
    baseline,
    font: fonts.brand,
    size: L.wordmarkSize,
    color: COLOR.navy,
  });
  drawText(page, second, {
    x: textX + firstW,
    baseline,
    font: fonts.brand,
    size: L.wordmarkSize,
    color: COLOR.teal,
  });

  const text = fit(label.toUpperCase(), fonts.uiBold);
  const labelW = drawText(page, text, {
    x: CX,
    baseline: L.labelTop,
    font: fonts.uiBold,
    size: L.labelSize,
    color: COLOR.navy,
    align: "center",
    tracking: L.labelTracking,
  });
  const ruleY = H - (L.labelTop - L.labelSize * 0.34);
  for (const dir of [-1, 1]) {
    const inner = CX + dir * (labelW / 2 + 14);
    page.drawLine({
      start: { x: inner, y: ruleY },
      end: { x: inner + dir * 44, y: ruleY },
      thickness: 0.6,
      color: COLOR.teal,
    });
  }
}

function drawBody(page: PDFPage, fonts: Fonts, content: CertificateContent) {
  const name = fitLines(
    fit(content.studentName, fonts.serif) || "Student",
    fonts.serif,
    L.nameSize,
    L.nameMinSize,
    L.contentWidth,
    2,
  );
  const title = fitLines(
    fit(content.title, fonts.brand),
    fonts.brand,
    L.titleSize,
    L.titleMinSize,
    L.contentWidth - 40,
    2,
  );
  const meta = content.meta ? fit(content.meta.toUpperCase(), fonts.uiBold) : "";

  // Baseline offsets relative to the "presented" line.
  const nameLead = name.size * 1.08;
  const nameFirst = name.size * 0.95 + 10;
  const nameLast = nameFirst + (name.lines.length - 1) * nameLead;
  const ornament = nameLast + name.size * 0.3 + 6;
  const completing = ornament + 28;
  const titleLead = title.size * 1.32;
  const titleFirst = completing + title.size + 14;
  const titleLast = titleFirst + (title.lines.length - 1) * titleLead;
  const metaLine = titleLast + 25;

  const ascent = L.supportSize * 0.66;
  const blockH = ascent + (meta ? metaLine : titleLast + title.size * 0.25);
  const top = (L.bodyTop + L.bodyBottom) / 2 - blockH / 2;
  const base = top + ascent;

  drawText(page, content.presentedLine, {
    x: CX,
    baseline: base,
    font: fonts.serifItalic,
    size: L.supportSize,
    color: COLOR.muted,
    align: "center",
  });

  name.lines.forEach((line, i) => {
    drawText(page, line, {
      x: CX,
      baseline: base + nameFirst + i * nameLead,
      font: fonts.serif,
      size: name.size,
      color: COLOR.navy,
      align: "center",
    });
  });

  const ornamentY = H - (base + ornament);
  for (const dir of [-1, 1]) {
    page.drawLine({
      start: { x: CX + dir * 9, y: ornamentY },
      end: { x: CX + dir * 150, y: ornamentY },
      thickness: 0.6,
      color: COLOR.navy,
      opacity: 0.3,
    });
    page.drawCircle({
      x: CX + dir * 150,
      y: ornamentY,
      size: 1.3,
      color: COLOR.teal,
    });
  }
  page.drawCircle({ x: CX, y: ornamentY, size: 2.6, color: COLOR.teal });

  drawText(page, content.completingLine, {
    x: CX,
    baseline: base + completing,
    font: fonts.serifItalic,
    size: L.supportSize,
    color: COLOR.muted,
    align: "center",
  });

  title.lines.forEach((line, i) => {
    drawText(page, line, {
      x: CX,
      baseline: base + titleFirst + i * titleLead,
      font: fonts.brand,
      size: title.size,
      color: COLOR.ink,
      align: "center",
    });
  });

  if (meta) {
    drawText(page, meta, {
      x: CX,
      baseline: base + metaLine,
      font: fonts.uiBold,
      size: L.metaSize,
      color: COLOR.teal,
      align: "center",
      tracking: L.metaTracking,
    });
  }
}

function drawRingText(
  page: PDFPage,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  font: PDFFont,
  size: number,
  color: Color,
) {
  const chars = [...text];
  const widths = chars.map((ch) => font.widthOfTextAtSize(ch, size));
  const gap =
    (2 * Math.PI * radius - widths.reduce((a, b) => a + b, 0)) / chars.length;
  // Centre the first phrase over the top of the ring.
  const firstPhrase = text.indexOf(" • ");
  let arc = 0;
  for (let i = 0; i < firstPhrase; i++) arc -= widths[i] + gap;
  arc = (arc + gap) / 2;

  chars.forEach((ch, i) => {
    // θ runs clockwise from 12 o'clock; glyph tops face outward.
    const theta = (arc + widths[i] / 2) / radius;
    const midX = cx + radius * Math.sin(theta);
    const midY = H - cy + radius * Math.cos(theta);
    page.drawText(ch, {
      x: midX - (widths[i] / 2) * Math.cos(theta),
      y: midY + (widths[i] / 2) * Math.sin(theta),
      size,
      font,
      color,
      rotate: degrees((-theta * 180) / Math.PI),
    });
    arc += widths[i] + gap;
  });
}

function drawSeal(page: PDFPage, fonts: Fonts) {
  const cy = L.sealCenter;
  const y = H - cy;
  const r = L.sealRadius;

  page.drawCircle({ x: CX, y, size: r, color: COLOR.navy });
  page.drawCircle({
    x: CX,
    y,
    size: r - 2.5,
    borderColor: COLOR.mint,
    borderWidth: 0.5,
    borderOpacity: 0.7,
  });
  page.drawCircle({
    x: CX,
    y,
    size: r - 13,
    borderColor: COLOR.mint,
    borderWidth: 0.5,
    borderOpacity: 0.7,
  });
  drawRingText(
    page,
    CERTIFICATE_SEAL_TEXT,
    CX,
    cy,
    r - 10,
    fonts.uiBold,
    5.4,
    COLOR.white,
  );
  drawMark(page, CX + 0.5, cy, 30, {
    navy: COLOR.white,
    teal: COLOR.mint,
    edge: COLOR.mint,
  });
}

function drawFooter(page: PDFPage, fonts: Fonts, content: CertificateContent) {
  const columns = [
    { x: CX - L.signatureOffset, ...content.signatory },
    { x: CX + L.signatureOffset, name: content.issuedOn, role: "Date issued" },
  ];
  const ruleY = H - (L.signatureBaseline + L.signatureRuleGap);

  for (const column of columns) {
    const name = fitLines(
      fit(column.name, fonts.serifItalic),
      fonts.serifItalic,
      18,
      13,
      L.signatureColumnWidth,
      1,
    );
    drawText(page, name.lines[0] ?? "", {
      x: column.x,
      baseline: L.signatureBaseline,
      font: fonts.serifItalic,
      size: name.size,
      color: COLOR.navy,
      align: "center",
    });
    page.drawLine({
      start: { x: column.x - L.signatureColumnWidth / 2, y: ruleY },
      end: { x: column.x + L.signatureColumnWidth / 2, y: ruleY },
      thickness: 0.6,
      color: COLOR.navy,
      opacity: 0.35,
    });
    drawText(page, column.role.toUpperCase(), {
      x: column.x,
      baseline: L.signatureBaseline + L.signatureRuleGap + 14,
      font: fonts.uiBold,
      size: L.smallSize,
      color: COLOR.muted,
      align: "center",
      tracking: 1.8,
    });
  }

  drawSeal(page, fonts);

  const label = "CREDENTIAL ID";
  const id = fit(content.credentialId, fonts.ui);
  const spacer = 10;
  const labelW = textWidth(label, fonts.uiBold, L.smallSize, 1.8);
  const idW = textWidth(id, fonts.ui, L.smallSize + 0.5, 0.6);
  const start = CX - (labelW + spacer + idW) / 2;
  drawText(page, label, {
    x: start,
    baseline: L.credentialBaseline,
    font: fonts.uiBold,
    size: L.smallSize,
    color: COLOR.muted,
    tracking: 1.8,
  });
  drawText(page, id, {
    x: start + labelW + spacer,
    baseline: L.credentialBaseline,
    font: fonts.ui,
    size: L.smallSize + 0.5,
    color: COLOR.ink,
    tracking: 0.6,
  });

  const prefix = "Verify at ";
  const url = fit(verifyUrlLabel(content.verifyUrl), fonts.ui);
  const prefixW = textWidth(prefix, fonts.ui, L.verifySize, 0.3);
  const urlW = textWidth(url, fonts.ui, L.verifySize, 0.3);
  const verifyStart = CX - (prefixW + urlW) / 2;
  drawText(page, prefix, {
    x: verifyStart,
    baseline: L.verifyBaseline,
    font: fonts.ui,
    size: L.verifySize,
    color: COLOR.muted,
    tracking: 0.3,
  });
  drawText(page, url, {
    x: verifyStart + prefixW,
    baseline: L.verifyBaseline,
    font: fonts.ui,
    size: L.verifySize,
    color: COLOR.teal,
    tracking: 0.3,
  });
  addLink(
    page,
    {
      x: verifyStart,
      top: L.verifyBaseline - L.verifySize,
      width: prefixW + urlW,
      height: L.verifySize * 1.4,
    },
    content.verifyUrl,
  );
}

/** Clickable URI area; `top` is measured from the top of the page like text baselines. */
export function addLink(
  page: PDFPage,
  box: { x: number; top: number; width: number; height: number },
  uri: string,
) {
  const { context } = page.doc;
  const y = page.getHeight() - box.top - box.height;
  const link = context.register(
    context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [box.x, y, box.x + box.width, y + box.height],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(uri) },
    }),
  );
  const existing = page.node.Annots();
  if (existing) existing.push(link);
  else page.node.set(PDFName.of("Annots"), context.obj([link]));
}

/** New PDF with the brand fonts embedded (subset), shared with receipts. */
export async function createBrandPdf() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const bytes = loadFontBytes();
  const fonts = Object.fromEntries(
    await Promise.all(
      (Object.keys(FONT_FILES) as FontKey[]).map(async (key) => [
        key,
        await pdfDoc.embedFont(bytes[key], { subset: true }),
      ]),
    ),
  ) as Fonts;
  return { pdfDoc, fonts };
}

async function renderCertificate(content: CertificateContent) {
  const { pdfDoc, fonts } = await createBrandPdf();

  pdfDoc.setTitle(`${content.title} — ${content.label}`);
  pdfDoc.setSubject(`${content.label} for ${content.studentName}`);
  pdfDoc.setAuthor("Convolution LMS");
  pdfDoc.setCreator("Convolution LMS");

  const page = pdfDoc.addPage([L.page.width, L.page.height]);
  drawFrame(page);
  drawHeader(page, fonts, content.label);
  drawBody(page, fonts, content);
  drawFooter(page, fonts, content);

  return pdfDoc.save();
}

export async function generateCertificatePdf(
  input: CertificatePdfInput,
): Promise<Uint8Array> {
  return renderCertificate(courseCertificateContent(input));
}

export async function generateRoadmapCertificatePdf(
  input: RoadmapCertificatePdfInput,
): Promise<Uint8Array> {
  return renderCertificate(roadmapCertificateContent(input));
}

export function certificatePdfFilename(courseTitle: string) {
  const slug = courseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "course"}-certificate.pdf`;
}

export function roadmapCertificatePdfFilename(roadmapTitle: string) {
  const slug = roadmapTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "roadmap"}-certificate.pdf`;
}
