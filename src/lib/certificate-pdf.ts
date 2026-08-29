import fs from "node:fs";
import path from "node:path";
import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
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

const BRAND = {
  paper: rgb(0.969, 0.965, 0.953),
  navy: rgb(0.016, 0.004, 0.424),
  teal: rgb(0.165, 0.667, 0.58),
  ink: rgb(0.196, 0.255, 0.38),
  muted: rgb(0.42, 0.447, 0.502),
  rule: rgb(0.847, 0.831, 0.8),
  white: rgb(1, 1, 1),
};

let cachedLogo: Uint8Array | null = null;

async function loadLogoBytes() {
  if (cachedLogo) return cachedLogo;

  const remoteUrl = staticAssets.logoRaster;
  if (remoteUrl.startsWith("http")) {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`Failed to load certificate logo from ImageKit (${response.status})`);
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
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function drawCenteredLines(
  page: PDFPage,
  lines: string[],
  yStart: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  lineHeight: number,
) {
  const { width } = page.getSize();
  let y = yStart;
  for (const line of lines) {
    const textWidth = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: (width - textWidth) / 2,
      y,
      size,
      font,
      color,
    });
    y -= lineHeight;
  }
  return y;
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

function drawFrame(page: PDFPage) {
  const { width, height } = page.getSize();
  const outer = 28;
  const inner = 40;

  page.drawRectangle({
    x: outer,
    y: outer,
    width: width - outer * 2,
    height: height - outer * 2,
    borderColor: BRAND.navy,
    borderWidth: 0.75,
    borderOpacity: 0.2,
    color: BRAND.paper,
  });

  page.drawRectangle({
    x: inner,
    y: inner,
    width: width - inner * 2,
    height: height - inner * 2,
    borderColor: BRAND.teal,
    borderWidth: 0.5,
    borderOpacity: 0.3,
    color: undefined,
  });

  const bracket = 18;
  drawCornerBracket(page, outer + 6, height - outer - 6, bracket, false, false);
  drawCornerBracket(page, width - outer - 6, height - outer - 6, bracket, true, false);
  drawCornerBracket(page, outer + 6, outer + 6, bracket, false, true);
  drawCornerBracket(page, width - outer - 6, outer + 6, bracket, true, true);
}

export async function generateCertificatePdf(
  input: CertificatePdfInput,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const logoBytes = await loadLogoBytes();
  const logo = await pdfDoc.embedPng(logoBytes);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: BRAND.paper,
  });

  drawFrame(page);

  const logoH = 44;
  const logoW = (logo.width / logo.height) * logoH;
  const wordEdu = "Edu";
  const wordJarr = "jarr";
  const brandSize = 22;
  const brandGap = 10;
  const brandTotal =
    logoW +
    brandGap +
    helveticaBold.widthOfTextAtSize(wordEdu + wordJarr, brandSize);
  const brandStartX = (width - brandTotal) / 2;
  const headerY = height - 78;

  page.drawImage(logo, {
    x: brandStartX,
    y: headerY - logoH / 2 + 4,
    width: logoW,
    height: logoH,
  });

  const textX = brandStartX + logoW + brandGap;
  page.drawText(wordEdu, {
    x: textX,
    y: headerY,
    size: brandSize,
    font: helveticaBold,
    color: BRAND.navy,
  });
  page.drawText(wordJarr, {
    x: textX + helveticaBold.widthOfTextAtSize(wordEdu, brandSize),
    y: headerY,
    size: brandSize,
    font: helveticaBold,
    color: BRAND.teal,
  });

  const ruleY = headerY - 22;
  page.drawLine({
    start: { x: width / 2 - 120, y: ruleY },
    end: { x: width / 2 + 120, y: ruleY },
    thickness: 0.75,
    color: BRAND.rule,
  });

  const certLabel = "CERTIFICATE OF COMPLETION";
  const labelSize = 9;
  const labelWidth = helveticaBold.widthOfTextAtSize(certLabel, labelSize);
  page.drawText(certLabel, {
    x: (width - labelWidth) / 2,
    y: ruleY - 18,
    size: labelSize,
    font: helveticaBold,
    color: BRAND.navy,
    opacity: 0.75,
  });

  const diamondY = ruleY - 34;
  page.drawLine({
    start: { x: width / 2 - 56, y: diamondY },
    end: { x: width / 2 - 8, y: diamondY },
    thickness: 0.75,
    color: BRAND.rule,
  });
  page.drawLine({
    start: { x: width / 2 + 8, y: diamondY },
    end: { x: width / 2 + 56, y: diamondY },
    thickness: 0.75,
    color: BRAND.rule,
  });
  page.drawLine({
    start: { x: width / 2, y: diamondY + 4 },
    end: { x: width / 2 + 4, y: diamondY },
    thickness: 1,
    color: BRAND.teal,
    opacity: 0.45,
  });
  page.drawLine({
    start: { x: width / 2 + 4, y: diamondY },
    end: { x: width / 2, y: diamondY - 4 },
    thickness: 1,
    color: BRAND.teal,
    opacity: 0.45,
  });
  page.drawLine({
    start: { x: width / 2, y: diamondY - 4 },
    end: { x: width / 2 - 4, y: diamondY },
    thickness: 1,
    color: BRAND.teal,
    opacity: 0.45,
  });
  page.drawLine({
    start: { x: width / 2 - 4, y: diamondY },
    end: { x: width / 2, y: diamondY + 4 },
    thickness: 1,
    color: BRAND.teal,
    opacity: 0.45,
  });

  const presented = "Presented to";
  const presentedWidth = timesItalic.widthOfTextAtSize(presented, 13);
  page.drawText(presented, {
    x: (width - presentedWidth) / 2,
    y: height - 200,
    size: 13,
    font: timesItalic,
    color: BRAND.muted,
  });

  const nameLines = wrapText(input.studentName, timesBold, 30, width - 200);
  let y = height - 238;
  y = drawCenteredLines(page, nameLines, y, timesBold, 30, BRAND.navy, 36);

  const underlineY = y - 6;
  page.drawLine({
    start: { x: width / 2 - 100, y: underlineY },
    end: { x: width / 2 + 100, y: underlineY },
    thickness: 0.5,
    color: BRAND.navy,
    opacity: 0.2,
  });
  page.drawLine({
    start: { x: width / 2 - 72, y: underlineY - 4 },
    end: { x: width / 2 + 72, y: underlineY - 4 },
    thickness: 0.5,
    color: BRAND.teal,
    opacity: 0.35,
  });

  const completed = "for successfully completing";
  const completedWidth = timesItalic.widthOfTextAtSize(completed, 13);
  page.drawText(completed, {
    x: (width - completedWidth) / 2,
    y: underlineY - 28,
    size: 13,
    font: timesItalic,
    color: BRAND.muted,
  });

  const courseLines = wrapText(
    input.courseTitle,
    helveticaBold,
    18,
    width - 180,
  );
  y = drawCenteredLines(
    page,
    courseLines,
    underlineY - 52,
    helveticaBold,
    18,
    BRAND.ink,
    24,
  );

  if (input.category) {
    const cat = input.category.toUpperCase();
    const catWidth = helvetica.widthOfTextAtSize(cat, 8);
    page.drawText(cat, {
      x: (width - catWidth) / 2,
      y: y - 6,
      size: 8,
      font: helvetica,
      color: BRAND.teal,
    });
  }

  const issued = input.issuedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const footerY = 88;
  const colW = 200;
  const leftX = width / 2 - colW - 40;
  const rightX = width / 2 + 40;

  page.drawLine({
    start: { x: leftX, y: footerY + 28 },
    end: { x: leftX + colW, y: footerY + 28 },
    thickness: 0.75,
    color: BRAND.rule,
  });
  page.drawText(input.instructorName, {
    x: leftX,
    y: footerY + 12,
    size: 10,
    font: helveticaBold,
    color: BRAND.ink,
  });
  page.drawText("Course instructor", {
    x: leftX,
    y: footerY,
    size: 8,
    font: helvetica,
    color: BRAND.muted,
  });

  page.drawLine({
    start: { x: rightX, y: footerY + 28 },
    end: { x: rightX + colW, y: footerY + 28 },
    thickness: 0.75,
    color: BRAND.rule,
  });
  page.drawText(issued, {
    x: rightX,
    y: footerY + 12,
    size: 10,
    font: helveticaBold,
    color: BRAND.ink,
  });
  page.drawText("Date issued", {
    x: rightX,
    y: footerY,
    size: 8,
    font: helvetica,
    color: BRAND.muted,
  });

  const sealSize = 52;
  const sealX = width / 2;
  const sealY = footerY + 14;
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: sealSize / 2,
    borderColor: BRAND.teal,
    borderWidth: 1.5,
    borderOpacity: 0.5,
    color: BRAND.white,
  });
  const sealLogoH = 28;
  const sealLogoW = (logo.width / logo.height) * sealLogoH;
  page.drawImage(logo, {
    x: sealX - sealLogoW / 2,
    y: sealY - sealLogoH / 2,
    width: sealLogoW,
    height: sealLogoH,
  });

  const verified = "VERIFIED";
  const verifiedWidth = helvetica.widthOfTextAtSize(verified, 7);
  page.drawText(verified, {
    x: (width - verifiedWidth) / 2,
    y: footerY - 14,
    size: 7,
    font: helvetica,
    color: BRAND.muted,
  });

  const credWidth = helvetica.widthOfTextAtSize(input.credentialId, 8);
  page.drawText(input.credentialId, {
    x: (width - credWidth) / 2,
    y: 52,
    size: 8,
    font: helvetica,
    color: BRAND.muted,
    opacity: 0.85,
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

export type RoadmapCertificatePdfInput = {
  studentName: string;
  roadmapTitle: string;
  courseCount: number;
  category?: string | null;
  credentialId: string;
  issuedAt: Date;
};

export async function generateRoadmapCertificatePdf(
  input: RoadmapCertificatePdfInput,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const logo = await pdfDoc.embedPng(await loadLogoBytes());

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: BRAND.paper,
  });
  drawFrame(page);

  const logoH = 44;
  const logoW = (logo.width / logo.height) * logoH;
  const wordEdu = "Edu";
  const wordJarr = "jarr";
  const brandSize = 22;
  const brandGap = 10;
  const brandTotal =
    logoW +
    brandGap +
    helveticaBold.widthOfTextAtSize(wordEdu + wordJarr, brandSize);
  const brandStartX = (width - brandTotal) / 2;
  const headerY = height - 78;

  page.drawImage(logo, {
    x: brandStartX,
    y: headerY - logoH / 2 + 4,
    width: logoW,
    height: logoH,
  });

  const textX = brandStartX + logoW + brandGap;
  page.drawText(wordEdu, {
    x: textX,
    y: headerY,
    size: brandSize,
    font: helveticaBold,
    color: BRAND.navy,
  });
  page.drawText(wordJarr, {
    x: textX + helveticaBold.widthOfTextAtSize(wordEdu, brandSize),
    y: headerY,
    size: brandSize,
    font: helveticaBold,
    color: BRAND.teal,
  });

  const ruleY = headerY - 22;
  page.drawLine({
    start: { x: width / 2 - 120, y: ruleY },
    end: { x: width / 2 + 120, y: ruleY },
    thickness: 0.75,
    color: BRAND.rule,
  });

  const certLabel = "ROADMAP COMPLETION CERTIFICATE";
  const labelWidth = helveticaBold.widthOfTextAtSize(certLabel, 9);
  page.drawText(certLabel, {
    x: (width - labelWidth) / 2,
    y: ruleY - 18,
    size: 9,
    font: helveticaBold,
    color: BRAND.navy,
    opacity: 0.75,
  });

  const presented = "Presented to";
  const presentedWidth = timesItalic.widthOfTextAtSize(presented, 13);
  page.drawText(presented, {
    x: (width - presentedWidth) / 2,
    y: height - 200,
    size: 13,
    font: timesItalic,
    color: BRAND.muted,
  });

  const nameLines = wrapText(input.studentName, timesBold, 30, width - 200);
  let y = height - 238;
  y = drawCenteredLines(page, nameLines, y, timesBold, 30, BRAND.navy, 36);

  const completed = "for completing the learning roadmap";
  const completedWidth = timesItalic.widthOfTextAtSize(completed, 13);
  page.drawText(completed, {
    x: (width - completedWidth) / 2,
    y: y - 20,
    size: 13,
    font: timesItalic,
    color: BRAND.muted,
  });

  const titleLines = wrapText(
    input.roadmapTitle,
    helveticaBold,
    18,
    width - 180,
  );
  y = drawCenteredLines(
    page,
    titleLines,
    y - 48,
    helveticaBold,
    18,
    BRAND.ink,
    24,
  );

  const meta = `${input.courseCount} course${input.courseCount === 1 ? "" : "s"} completed${
    input.category ? ` · ${input.category}` : ""
  }`;
  const metaWidth = helvetica.widthOfTextAtSize(meta, 10);
  page.drawText(meta, {
    x: (width - metaWidth) / 2,
    y: y - 10,
    size: 10,
    font: helvetica,
    color: BRAND.teal,
  });

  const issued = input.issuedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const footerY = 88;
  page.drawLine({
    start: { x: width / 2 - 100, y: footerY + 28 },
    end: { x: width / 2 + 100, y: footerY + 28 },
    thickness: 0.75,
    color: BRAND.rule,
  });
  const dateLabel = `Issued ${issued}`;
  const dateWidth = helveticaBold.widthOfTextAtSize(dateLabel, 10);
  page.drawText(dateLabel, {
    x: (width - dateWidth) / 2,
    y: footerY + 12,
    size: 10,
    font: helveticaBold,
    color: BRAND.ink,
  });

  const sealSize = 52;
  const sealX = width / 2;
  const sealY = footerY + 70;
  page.drawCircle({
    x: sealX,
    y: sealY,
    size: sealSize / 2,
    borderColor: BRAND.teal,
    borderWidth: 1.5,
    borderOpacity: 0.5,
    color: BRAND.white,
  });
  const sealLogoH = 28;
  const sealLogoW = (logo.width / logo.height) * sealLogoH;
  page.drawImage(logo, {
    x: sealX - sealLogoW / 2,
    y: sealY - sealLogoH / 2,
    width: sealLogoW,
    height: sealLogoH,
  });

  const credWidth = helvetica.widthOfTextAtSize(input.credentialId, 8);
  page.drawText(input.credentialId, {
    x: (width - credWidth) / 2,
    y: 52,
    size: 8,
    font: helvetica,
    color: BRAND.muted,
    opacity: 0.85,
  });

  return pdfDoc.save();
}

export function roadmapCertificatePdfFilename(roadmapTitle: string) {
  const slug = roadmapTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "roadmap"}-certificate.pdf`;
}

