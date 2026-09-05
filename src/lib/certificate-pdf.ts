import fs from "node:fs";
import path from "node:path";
import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFPage,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";
import { CERTIFICATE_LAYOUT } from "@/lib/certificate-design";
import { staticAssets } from "@/lib/static-assets";
import { imagekitAsset } from "@/lib/imagekit-url";

export type CertificatePdfInput = {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  category?: string | null;
  credentialId: string;
  issuedAt: Date;
};

export type RoadmapCertificatePdfInput = {
  studentName: string;
  roadmapTitle: string;
  courseCount: number;
  category?: string | null;
  credentialId: string;
  issuedAt: Date;
};

const BRAND = {
  paper: rgb(0.969, 0.965, 0.953),
  navy: rgb(0.016, 0.004, 0.424),
  teal: rgb(0.165, 0.667, 0.58),
  ink: rgb(0.196, 0.255, 0.38),
  muted: rgb(0.42, 0.447, 0.502),
  rule: rgb(0.847, 0.831, 0.8),
  white: rgb(1, 1, 1),
};

const PAGE = CERTIFICATE_LAYOUT.page;
const FRAME_OUTER = CERTIFICATE_LAYOUT.frameOuter;
const FRAME_INNER = CERTIFICATE_LAYOUT.frameInner;
const L = CERTIFICATE_LAYOUT;

let cachedLogo: Uint8Array | null = null;

async function loadLogoBytes() {
  if (cachedLogo) return cachedLogo;

  const remoteUrl = staticAssets.logoRaster;
  if (remoteUrl.startsWith("http")) {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to load certificate logo from ImageKit (${response.status})`,
      );
    }
    cachedLogo = new Uint8Array(await response.arrayBuffer());
    return cachedLogo;
  }

  const logoPath = path.join(
    process.cwd(),
    "public",
    imagekitAsset("/images/logo/mark-raster.png").replace(/^\//, ""),
  );
  cachedLogo = fs.readFileSync(logoPath);
  return cachedLogo;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines = 3,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (
    lines.length === maxLines &&
    words.join(" ").length > lines.join(" ").length
  ) {
    let trimmed = lines[maxLines - 1];
    while (
      trimmed.length > 1 &&
      font.widthOfTextAtSize(`${trimmed}…`, size) > maxWidth
    ) {
      trimmed = trimmed.slice(0, -1);
    }
    lines[maxLines - 1] = `${trimmed}…`;
  }

  return lines.length > 0 ? lines : [text.slice(0, 40)];
}

function centerX(pageWidth: number, text: string, font: PDFFont, size: number) {
  return (pageWidth - font.widthOfTextAtSize(text, size)) / 2;
}

function drawCornerBracket(
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  flipX: boolean,
  flipY: boolean,
) {
  const dx = flipX ? -1 : 1;
  const dy = flipY ? -1 : 1;
  page.drawLine({
    start: { x, y },
    end: { x: x + size * dx, y },
    thickness: 1.5,
    color: BRAND.navy,
    opacity: 0.35,
  });
  page.drawLine({
    start: { x, y },
    end: { x, y: y + size * dy },
    thickness: 1.5,
    color: BRAND.navy,
    opacity: 0.35,
  });
}

function drawPaperAndFrame(page: PDFPage) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: BRAND.paper });

  page.drawRectangle({
    x: FRAME_OUTER,
    y: FRAME_OUTER,
    width: width - FRAME_OUTER * 2,
    height: height - FRAME_OUTER * 2,
    borderColor: BRAND.navy,
    borderWidth: 0.75,
    borderOpacity: 0.2,
    color: undefined,
  });
  page.drawRectangle({
    x: FRAME_INNER,
    y: FRAME_INNER,
    width: width - FRAME_INNER * 2,
    height: height - FRAME_INNER * 2,
    borderColor: BRAND.teal,
    borderWidth: 0.5,
    borderOpacity: 0.28,
    color: undefined,
  });

  const b = 18;
  drawCornerBracket(page, FRAME_OUTER + 6, height - FRAME_OUTER - 6, b, false, false);
  drawCornerBracket(page, width - FRAME_OUTER - 6, height - FRAME_OUTER - 6, b, true, false);
  drawCornerBracket(page, FRAME_OUTER + 6, FRAME_OUTER + 6, b, false, true);
  drawCornerBracket(page, width - FRAME_OUTER - 6, FRAME_OUTER + 6, b, true, true);
}

const SEAL_RADIUS = 28;

function drawSeal(page: PDFPage, logo: PDFImage, x: number, y: number) {
  page.drawCircle({
    x,
    y,
    size: SEAL_RADIUS,
    borderColor: BRAND.teal,
    borderWidth: 2,
    color: BRAND.white,
  });
  const logoH = 26;
  const logoW = (logo.width / logo.height) * logoH;
  page.drawImage(logo, {
    x: x - logoW / 2,
    y: y - logoH / 2,
    width: logoW,
    height: logoH,
  });
}

type SharedFonts = {
  helvetica: PDFFont;
  helveticaBold: PDFFont;
  timesItalic: PDFFont;
  timesBold: PDFFont;
};

/**
 * Formal certificate: header fixed at top, footer fixed at bottom,
 * body centered in the remaining middle — no blank strip under the ID.
 */
function drawCertificateLayout(
  page: PDFPage,
  logo: PDFImage,
  fonts: SharedFonts,
  content: {
    label: string;
    studentName: string;
    presentedLine: string;
    completingLine: string;
    title: string;
    subtitle?: string | null;
    leftName: string;
    leftRole: string;
    rightName: string;
    rightRole: string;
    credentialId: string;
  },
) {
  const { width, height } = page.getSize();
  const { helvetica, helveticaBold, timesItalic, timesBold } = fonts;
  const contentWidth = width - L.margin * 2 - 24;
  const cx = width / 2;

  const nameSize = L.nameSize;
  const titleSize = L.titleSize;
  const supportSize = L.supportSize;
  const nameLines = wrapText(content.studentName, timesBold, nameSize, contentWidth, 2);
  const titleLines = wrapText(content.title, helveticaBold, titleSize, contentWidth - 40, 3);

  // ── Fixed footer: seal, VERIFIED clear below arc, then signatures + id ──
  const credY = FRAME_INNER + 20;
  const verifiedY = credY + 30;
  const sealY = verifiedY + 16 + SEAL_RADIUS;
  // Signature line above name/role with room for 11pt glyphs (pdf baseline).
  const nameY = verifiedY + 12;
  const lineY = nameY + 18;
  const roleY = nameY - 14;
  const footerTop = sealY + SEAL_RADIUS + 10;

  const colW = 180;
  const leftX = cx - colW - 78;
  const rightX = cx + 78;

  drawSeal(page, logo, cx, sealY);
  const verified = "VERIFIED";
  page.drawText(verified, {
    x: centerX(width, verified, helvetica, 7),
    y: verifiedY,
    size: 7,
    font: helvetica,
    color: BRAND.teal,
  });

  page.drawLine({
    start: { x: leftX, y: lineY },
    end: { x: leftX + colW, y: lineY },
    thickness: 0.8,
    color: BRAND.rule,
  });
  page.drawText(content.leftName.slice(0, 40), {
    x: leftX,
    y: nameY,
    size: 11,
    font: helveticaBold,
    color: BRAND.ink,
  });
  page.drawText(content.leftRole, {
    x: leftX,
    y: roleY,
    size: 9,
    font: helvetica,
    color: BRAND.muted,
  });

  page.drawLine({
    start: { x: rightX, y: lineY },
    end: { x: rightX + colW, y: lineY },
    thickness: 0.8,
    color: BRAND.rule,
  });
  const rightName = content.rightName.slice(0, 40);
  page.drawText(rightName, {
    x: rightX + colW - helveticaBold.widthOfTextAtSize(rightName, 11),
    y: nameY,
    size: 11,
    font: helveticaBold,
    color: BRAND.ink,
  });
  page.drawText(content.rightRole, {
    x: rightX + colW - helvetica.widthOfTextAtSize(content.rightRole, 9),
    y: roleY,
    size: 9,
    font: helvetica,
    color: BRAND.muted,
  });

  const cred = `Credential ID · ${content.credentialId}`;
  page.drawText(cred, {
    x: centerX(width, cred, helvetica, 8),
    y: credY,
    size: 8,
    font: helvetica,
    color: BRAND.muted,
  });

  // ── Header (fixed at top) ──
  let headerY = height - L.margin - 4;
  const logoH = 32;
  const logoW = (logo.width / logo.height) * logoH;
  const brandSize = 17;
  const brandGap = 9;
  const brandW =
    logoW + brandGap + helveticaBold.widthOfTextAtSize("Edujarr", brandSize);
  const brandX = (width - brandW) / 2;
  page.drawImage(logo, {
    x: brandX,
    y: headerY - logoH + 9,
    width: logoW,
    height: logoH,
  });
  page.drawText("Edu", {
    x: brandX + logoW + brandGap,
    y: headerY - 11,
    size: brandSize,
    font: helveticaBold,
    color: BRAND.navy,
  });
  page.drawText("jarr", {
    x:
      brandX +
      logoW +
      brandGap +
      helveticaBold.widthOfTextAtSize("Edu", brandSize),
    y: headerY - 11,
    size: brandSize,
    font: helveticaBold,
    color: BRAND.teal,
  });
  headerY -= 34;

  page.drawLine({
    start: { x: cx - 56, y: headerY },
    end: { x: cx + 56, y: headerY },
    thickness: 0.7,
    color: BRAND.rule,
  });
  headerY -= 16;

  page.drawText(content.label, {
    x: centerX(width, content.label, helveticaBold, 9),
    y: headerY,
    size: 9,
    font: helveticaBold,
    color: BRAND.navy,
  });
  headerY -= 14;

  page.drawLine({
    start: { x: cx - 44, y: headerY },
    end: { x: cx - 8, y: headerY },
    thickness: 0.7,
    color: BRAND.rule,
  });
  page.drawLine({
    start: { x: cx + 8, y: headerY },
    end: { x: cx + 44, y: headerY },
    thickness: 0.7,
    color: BRAND.rule,
  });
  page.drawLine({
    start: { x: cx, y: headerY + 3 },
    end: { x: cx + 3, y: headerY },
    thickness: 1,
    color: BRAND.teal,
  });
  page.drawLine({
    start: { x: cx + 3, y: headerY },
    end: { x: cx, y: headerY - 3 },
    thickness: 1,
    color: BRAND.teal,
  });
  page.drawLine({
    start: { x: cx, y: headerY - 3 },
    end: { x: cx - 3, y: headerY },
    thickness: 1,
    color: BRAND.teal,
  });
  page.drawLine({
    start: { x: cx - 3, y: headerY },
    end: { x: cx, y: headerY + 3 },
    thickness: 1,
    color: BRAND.teal,
  });
  const headerBottom = headerY - 8;

  // ── Body centered between header and footer ──
  // pdf-lib y is baseline; keep name clear of neighbors without excess air.
  const afterPresented = Math.ceil(nameSize * 0.74) + 2;
  const nameLineGap = 6;
  const afterCompleting = Math.ceil(titleSize * 0.72) + 4;
  const underName = Math.ceil(nameSize * 0.2); // rule snug under glyphs

  const bodyBlockH =
    supportSize +
    afterPresented +
    nameLines.length * nameSize +
    Math.max(0, nameLines.length - 1) * nameLineGap +
    underName +
    14 +
    supportSize +
    afterCompleting +
    titleLines.length * (titleSize + 6) +
    (content.subtitle ? 24 : 0);

  const bodyTop = headerBottom - 20;
  const bodyBottom = footerTop + 16;
  const available = bodyTop - bodyBottom;
  let y =
    available > bodyBlockH
      ? bodyBottom + (available + bodyBlockH) / 2
      : bodyTop;

  page.drawText(content.presentedLine, {
    x: centerX(width, content.presentedLine, timesItalic, supportSize),
    y,
    size: supportSize,
    font: timesItalic,
    color: BRAND.muted,
  });
  y -= afterPresented;

  let nameBaseline = y;
  for (let i = 0; i < nameLines.length; i++) {
    const line = nameLines[i];
    page.drawText(line, {
      x: centerX(width, line, timesBold, nameSize),
      y,
      size: nameSize,
      font: timesBold,
      color: BRAND.navy,
    });
    nameBaseline = y;
    if (i < nameLines.length - 1) y -= nameSize + nameLineGap;
  }

  // Thin rule snug under the name, then completing line close below.
  const ruleY = nameBaseline - underName;
  page.drawLine({
    start: { x: cx - 90, y: ruleY },
    end: { x: cx + 90, y: ruleY },
    thickness: 0.55,
    color: BRAND.navy,
    opacity: 0.2,
  });
  page.drawLine({
    start: { x: cx - 64, y: ruleY - 3 },
    end: { x: cx + 64, y: ruleY - 3 },
    thickness: 0.55,
    color: BRAND.teal,
    opacity: 0.4,
  });
  y = ruleY - 12;

  page.drawText(content.completingLine, {
    x: centerX(width, content.completingLine, timesItalic, supportSize),
    y,
    size: supportSize,
    font: timesItalic,
    color: BRAND.muted,
  });
  y -= afterCompleting;

  for (const line of titleLines) {
    page.drawText(line, {
      x: centerX(width, line, helveticaBold, titleSize),
      y,
      size: titleSize,
      font: helveticaBold,
      color: BRAND.ink,
    });
    y -= titleSize + 6;
  }

  if (content.subtitle) {
    const sub = content.subtitle.toUpperCase();
    page.drawText(sub, {
      x: centerX(width, sub, helvetica, 9),
      y: y - 6,
      size: 9,
      font: helvetica,
      color: BRAND.teal,
    });
  }
}

async function createLandscapeDoc() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  const fonts: SharedFonts = {
    helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
    helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    timesItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    timesBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
  };
  const logo = await pdfDoc.embedPng(await loadLogoBytes());
  drawPaperAndFrame(page);
  return { pdfDoc, page, fonts, logo };
}

export async function generateCertificatePdf(
  input: CertificatePdfInput,
): Promise<Uint8Array> {
  const { pdfDoc, page, fonts, logo } = await createLandscapeDoc();
  const issued = input.issuedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  drawCertificateLayout(page, logo, fonts, {
    label: "CERTIFICATE OF COMPLETION",
    studentName: input.studentName,
    presentedLine: "This certifies that",
    completingLine: "has successfully completed",
    title: input.courseTitle,
    subtitle: input.category ?? null,
    leftName: input.instructorName,
    leftRole: "Course instructor",
    rightName: issued,
    rightRole: "Date issued",
    credentialId: input.credentialId,
  });

  return pdfDoc.save();
}

export async function generateRoadmapCertificatePdf(
  input: RoadmapCertificatePdfInput,
): Promise<Uint8Array> {
  const { pdfDoc, page, fonts, logo } = await createLandscapeDoc();
  const issued = input.issuedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const meta = `${input.courseCount} course${input.courseCount === 1 ? "" : "s"} completed${
    input.category ? ` · ${input.category}` : ""
  }`;

  drawCertificateLayout(page, logo, fonts, {
    label: "ROADMAP COMPLETION CERTIFICATE",
    studentName: input.studentName,
    presentedLine: "This certifies that",
    completingLine: "has successfully completed the learning path",
    title: input.roadmapTitle,
    subtitle: meta,
    leftName: "Edujarr",
    leftRole: "Learning path",
    rightName: issued,
    rightRole: "Date issued",
    credentialId: input.credentialId,
  });

  return pdfDoc.save();
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
