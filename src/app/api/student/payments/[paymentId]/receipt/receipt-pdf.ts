import type { PDFFont, PDFPage } from "pdf-lib";
import {
  COLOR,
  createBrandPdf,
  drawMark,
  drawText,
  fit,
  textWidth,
  wrapText,
  type Fonts,
} from "@/lib/certificate-pdf";
import { formatDateTime } from "@/lib/format";
import { formatNprFromPaisa } from "@/lib/pricing";

export type PaymentReceiptInput = {
  institute: { name: string; supportEmail: string; contactPhone: string };
  student: { name: string; email: string };
  course: { title: string; instructorName: string };
  amountPaisa: number;
  orderId: string;
  method: string;
  reference: string | null;
  submittedAt: Date;
  paidAt: Date;
  generatedAt: Date;
};

/** A4 portrait, in points; baselines are measured from the top like the certificate. */
const PAGE = { width: 595, height: 842 };
const MARGIN = 56;
const RIGHT = PAGE.width - MARGIN;
const CONTENT = PAGE.width - MARGIN * 2;

function rule(page: PDFPage, top: number, opacity = 0.14, color = COLOR.navy) {
  page.drawLine({
    start: { x: MARGIN, y: PAGE.height - top },
    end: { x: RIGHT, y: PAGE.height - top },
    thickness: 0.6,
    color,
    opacity,
  });
}

function label(page: PDFPage, fonts: Fonts, text: string, x: number, baseline: number, align: "left" | "right" = "left") {
  drawText(page, text.toUpperCase(), {
    x,
    baseline,
    font: fonts.uiBold,
    size: 7.5,
    color: COLOR.muted,
    tracking: 1.6,
    align,
  });
}

/** Single line, shrunk by trimming with an ellipsis when it would overflow. */
function clip(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1).trimEnd();
  }
  return `${out}…`;
}

export async function generatePaymentReceiptPdf(input: PaymentReceiptInput) {
  const { pdfDoc, fonts } = await createBrandPdf();
  const institute = fit(input.institute.name, fonts.brand) || "Convolution LMS";
  const amount = fit(formatNprFromPaisa(input.amountPaisa), fonts.brand);

  pdfDoc.setTitle(`Payment receipt — ${input.course.title}`);
  pdfDoc.setSubject(`Payment receipt ${input.orderId}`);
  pdfDoc.setAuthor(institute);
  pdfDoc.setCreator(institute);

  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: COLOR.paper });
  // Brand band along the top edge.
  page.drawRectangle({ x: 0, y: PAGE.height - 6, width: PAGE.width, height: 6, color: COLOR.navy });
  page.drawRectangle({ x: 0, y: PAGE.height - 8, width: PAGE.width, height: 2, color: COLOR.teal });

  // Header: mark + institute name, receipt label on the right.
  drawMark(page, MARGIN + 13, 70, 30, { navy: COLOR.navy, teal: COLOR.teal, edge: COLOR.teal });
  drawText(page, clip(institute, fonts.brand, 16, CONTENT - 200), {
    x: MARGIN + 34,
    baseline: 76,
    font: fonts.brand,
    size: 16,
    color: COLOR.navy,
  });
  drawText(page, "PAYMENT RECEIPT", {
    x: RIGHT,
    baseline: 68,
    font: fonts.uiBold,
    size: 9,
    color: COLOR.navy,
    tracking: 2.4,
    align: "right",
  });
  drawText(page, fit(formatDateTime(input.paidAt), fonts.ui), {
    x: RIGHT,
    baseline: 82,
    font: fonts.ui,
    size: 8.5,
    color: COLOR.muted,
    align: "right",
  });
  rule(page, 104, 0.8, COLOR.teal);

  // Billed to / paid stamp.
  label(page, fonts, "Billed to", MARGIN, 136);
  drawText(page, clip(fit(input.student.name, fonts.serif) || "Student", fonts.serif, 22, CONTENT - 160), {
    x: MARGIN,
    baseline: 162,
    font: fonts.serif,
    size: 22,
    color: COLOR.navy,
  });
  drawText(page, clip(fit(input.student.email, fonts.ui), fonts.ui, 9.5, CONTENT - 160), {
    x: MARGIN,
    baseline: 178,
    font: fonts.ui,
    size: 9.5,
    color: COLOR.ink,
  });

  const stampW = 92;
  const stampX = RIGHT - stampW;
  page.drawRectangle({
    x: stampX,
    y: PAGE.height - 172,
    width: stampW,
    height: 30,
    borderColor: COLOR.teal,
    borderWidth: 1.2,
  });
  drawText(page, "PAID", {
    x: stampX + stampW / 2,
    baseline: 162,
    font: fonts.uiBold,
    size: 12,
    color: COLOR.teal,
    tracking: 4,
    align: "center",
  });

  // Line item.
  const tableTop = 222;
  label(page, fonts, "Description", MARGIN, tableTop);
  label(page, fonts, "Amount", RIGHT, tableTop, "right");
  rule(page, tableTop + 9);

  const titleLines = wrapText(fit(input.course.title, fonts.brand), fonts.brand, 12.5, CONTENT - 150, 2);
  titleLines.forEach((line, index) => {
    drawText(page, line, {
      x: MARGIN,
      baseline: tableTop + 32 + index * 17,
      font: fonts.brand,
      size: 12.5,
      color: COLOR.ink,
    });
  });
  const itemMeta = tableTop + 32 + (titleLines.length - 1) * 17 + 16;
  drawText(page, clip(fit(`Course enrollment · Instructor ${input.course.instructorName}`, fonts.ui), fonts.ui, 9, CONTENT - 150), {
    x: MARGIN,
    baseline: itemMeta,
    font: fonts.ui,
    size: 9,
    color: COLOR.muted,
  });
  drawText(page, amount, {
    x: RIGHT,
    baseline: tableTop + 32,
    font: fonts.brand,
    size: 12.5,
    color: COLOR.ink,
    align: "right",
  });
  rule(page, itemMeta + 16);

  const totalTop = itemMeta + 50;
  label(page, fonts, "Total paid", RIGHT - textWidth(amount, fonts.brand, 20) - 18, totalTop - 2, "right");
  drawText(page, amount, {
    x: RIGHT,
    baseline: totalTop,
    font: fonts.brand,
    size: 20,
    color: COLOR.navy,
    align: "right",
  });

  // Payment details.
  const detailsTop = totalTop + 50;
  label(page, fonts, "Payment details", MARGIN, detailsTop);
  rule(page, detailsTop + 9);
  const details: [string, string][] = [
    ["Payment method", input.method],
    ["Transaction reference", input.reference?.trim() || "—"],
    ["Order ID", input.orderId],
    ["Submitted", formatDateTime(input.submittedAt)],
    ["Approved", formatDateTime(input.paidAt)],
    ["Status", "Paid in full"],
  ];
  details.forEach(([name, value], index) => {
    const baseline = detailsTop + 30 + index * 22;
    drawText(page, name, {
      x: MARGIN,
      baseline,
      font: fonts.ui,
      size: 9.5,
      color: COLOR.muted,
    });
    drawText(page, clip(fit(value, fonts.ui), fonts.ui, 9.5, CONTENT - 170), {
      x: MARGIN + 170,
      baseline,
      font: name === "Order ID" ? fonts.ui : fonts.uiBold,
      size: 9.5,
      color: COLOR.ink,
    });
  });

  // Footer.
  const footerTop = PAGE.height - 92;
  rule(page, footerTop);
  const contact = [input.institute.supportEmail, input.institute.contactPhone]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("  ·  ");
  drawText(page, clip(fit(contact ? `${institute}  ·  ${contact}` : institute, fonts.uiBold), fonts.uiBold, 8.5, CONTENT), {
    x: MARGIN,
    baseline: footerTop + 22,
    font: fonts.uiBold,
    size: 8.5,
    color: COLOR.navy,
  });
  drawText(
    page,
    fit(
      `Generated ${formatDateTime(input.generatedAt)}. This is a computer-generated receipt and needs no signature.`,
      fonts.ui,
    ),
    {
      x: MARGIN,
      baseline: footerTop + 38,
      font: fonts.ui,
      size: 8,
      color: COLOR.muted,
    },
  );

  return pdfDoc.save();
}

export function receiptFilename(orderId: string) {
  const slug = orderId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `receipt-${slug || "payment"}.pdf`;
}
