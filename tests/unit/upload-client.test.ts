import { describe, expect, it } from "vitest";
import {
  UPLOAD_PURPOSES,
  detectFileType,
  fileTypeForMime,
  isAllowedForPurpose,
  isUploadPurpose,
  storedFileName,
  unsupportedTypeMessage,
} from "@/lib/upload-client";

const bytes = (...values: (number | string)[]) =>
  new Blob([
    new Uint8Array(
      values.flatMap((value) => (typeof value === "string" ? [...value].map((c) => c.charCodeAt(0)) : [value])),
    ),
  ]);

/** Minimal ZIP: a local header signature, then a central directory and end record listing `names`. */
function zip(names: string[]) {
  const encoder = new TextEncoder();
  const local = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(26).fill(0)]);
  const entries = names.map((name) => {
    const encoded = encoder.encode(name);
    const entry = new Uint8Array(46 + encoded.length);
    const view = new DataView(entry.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(28, encoded.length, true);
    entry.set(encoded, 46);
    return entry;
  });
  const directorySize = entries.reduce((sum, entry) => sum + entry.length, 0);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(10, names.length, true);
  view.setUint32(12, directorySize, true);
  view.setUint32(16, local.length, true);
  return new Blob([local, ...entries, end]);
}

describe("upload purposes", () => {
  it("recognizes only declared purposes", () => {
    expect(isUploadPurpose("avatar")).toBe(true);
    expect(isUploadPurpose("payment-screenshot")).toBe(true);
    for (const value of ["toString", "__proto__", "constructor", "nope"]) {
      expect(isUploadPurpose(value), value).toBe(false);
    }
  });

  it("restricts who may upload what", () => {
    expect(UPLOAD_PURPOSES["payment-qr"].access).toBe("admin");
    expect(UPLOAD_PURPOSES["course-thumbnail"].access).toBe("teacher");
    expect(UPLOAD_PURPOSES.avatar.documents).toBe(false);
    expect(UPLOAD_PURPOSES.submission.documents).toBe(true);
  });

  it("allows documents only where the purpose does", () => {
    const pdf = fileTypeForMime("application/pdf")!;
    const png = fileTypeForMime("image/png")!;
    expect(isAllowedForPurpose(pdf, "avatar")).toBe(false);
    expect(isAllowedForPurpose(pdf, "lesson-resource")).toBe(true);
    expect(isAllowedForPurpose(png, "avatar")).toBe(true);
    expect(unsupportedTypeMessage("avatar")).toMatch(/image/i);
    expect(unsupportedTypeMessage("submission")).toMatch(/PDF/);
  });

  it("maps MIME types", () => {
    expect(fileTypeForMime("image/jpeg")).toMatchObject({ extension: "jpg", kind: "image" });
    expect(fileTypeForMime("application/x-msdownload")).toBeNull();
  });
});

describe("storedFileName", () => {
  const jpeg = fileTypeForMime("image/jpeg")!;

  it("keeps a safe base name and forces the detected extension", () => {
    expect(storedFileName("My Photo (1).PNG", jpeg)).toBe("My_Photo_1.jpg");
    expect(storedFileName("invoice.pdf.exe", fileTypeForMime("application/pdf")!)).toBe("invoice_pdf.pdf");
  });

  it("never keeps path separators", () => {
    const name = storedFileName("../../etc/passwd", jpeg);
    expect(name).not.toMatch(/[/\\]/);
    expect(name.endsWith(".jpg")).toBe(true);
    expect(storedFileName("...", jpeg)).toBe("file.jpg");
  });

  it("caps the base name length", () => {
    expect(storedFileName(`${"a".repeat(200)}.png`, jpeg)).toBe(`${"a".repeat(80)}.jpg`);
  });
});

describe("detectFileType", () => {
  it("detects images from their signatures", async () => {
    expect((await detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0)))?.mime).toBe("image/jpeg");
    expect((await detectFileType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0)))?.mime).toBe("image/png");
    expect((await detectFileType(bytes("GIF89a", 0, 0)))?.mime).toBe("image/gif");
    expect((await detectFileType(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 ")))?.mime).toBe("image/webp");
    expect((await detectFileType(bytes(0, 0, 0, 24, "ftypavif", 0, 0, 0, 0, "mif1avif")))?.mime).toBe("image/avif");
  });

  it("detects PDFs and plain text", async () => {
    expect((await detectFileType(bytes("%PDF-1.7\n")))?.mime).toBe("application/pdf");
    expect((await detectFileType(new Blob(["# Notes\nplain text, UTF-8 ✓\n"])))?.mime).toBe("text/plain");
  });

  it("rejects empty, binary and executable content", async () => {
    expect(await detectFileType(new Blob([]))).toBeNull();
    expect(await detectFileType(bytes("MZ", 0x90, 0, 3, 0))).toBeNull();
    expect(await detectFileType(bytes(0x00, 0x01, 0x02))).toBeNull();
  });

  it("tells Office documents apart from plain archives", async () => {
    expect((await detectFileType(zip(["[Content_Types].xml", "word/document.xml"])))?.extension).toBe("docx");
    expect((await detectFileType(zip(["[Content_Types].xml", "ppt/presentation.xml"])))?.extension).toBe("pptx");
    expect((await detectFileType(zip(["[Content_Types].xml", "xl/workbook.xml"])))?.extension).toBe("xlsx");
    expect((await detectFileType(zip(["notes.txt"])))?.extension).toBe("zip");
  });

  it("keeps macro-enabled Office files as plain zips", async () => {
    const type = await detectFileType(zip(["[Content_Types].xml", "word/document.xml", "word/vbaProject.bin"]));
    expect(type?.extension).toBe("zip");
  });
});
