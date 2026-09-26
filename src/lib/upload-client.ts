/**
 * Upload helpers shared by the browser and the upload routes: what each upload
 * purpose accepts, file-type detection from the file's bytes, and uploadFile().
 * Keep this module free of server-only imports; the routes import it too.
 */

export type UploadPurpose =
  | "avatar"
  | "course-thumbnail"
  | "roadmap-cover"
  | "lesson-resource"
  | "payment-screenshot"
  | "payment-qr"
  | "submission";

export type UploadAccess = "any" | "teacher" | "admin";

/** What the file is for decides its folder, who may upload it, and whether documents are allowed. */
export const UPLOAD_PURPOSES: Record<
  UploadPurpose,
  { folder: string; access: UploadAccess; documents: boolean }
> = {
  avatar: { folder: "avatars", access: "any", documents: false },
  "course-thumbnail": { folder: "course-thumbnails", access: "teacher", documents: false },
  "roadmap-cover": { folder: "roadmap-covers", access: "admin", documents: false },
  "lesson-resource": { folder: "lesson-resources", access: "teacher", documents: true },
  "payment-screenshot": { folder: "payment-screenshots", access: "any", documents: false },
  "payment-qr": { folder: "payment-assets", access: "admin", documents: false },
  submission: { folder: "submissions", access: "any", documents: true },
};

export function isUploadPurpose(value: string): value is UploadPurpose {
  return Object.hasOwn(UPLOAD_PURPOSES, value);
}

export type DetectedFileType = {
  mime: string;
  extension: string;
  kind: "image" | "document";
};

const FILE_TYPES = {
  jpeg: { mime: "image/jpeg", extension: "jpg", kind: "image" },
  png: { mime: "image/png", extension: "png", kind: "image" },
  gif: { mime: "image/gif", extension: "gif", kind: "image" },
  webp: { mime: "image/webp", extension: "webp", kind: "image" },
  avif: { mime: "image/avif", extension: "avif", kind: "image" },
  pdf: { mime: "application/pdf", extension: "pdf", kind: "document" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
    kind: "document",
  },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: "pptx",
    kind: "document",
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
    kind: "document",
  },
  zip: { mime: "application/zip", extension: "zip", kind: "document" },
  text: { mime: "text/plain", extension: "txt", kind: "document" },
} satisfies Record<string, DetectedFileType>;

/** `accept` values for file inputs; the server still checks the bytes. */
export const UPLOAD_ACCEPT = {
  image: "image/jpeg,image/png,image/webp,image/gif,image/avif",
  document:
    "image/jpeg,image/png,image/webp,image/gif,image/avif,.pdf,.docx,.pptx,.xlsx,.zip,.txt,.md,.csv",
};

export function fileTypeForMime(mime: string): DetectedFileType | null {
  return Object.values(FILE_TYPES).find((type) => type.mime === mime) ?? null;
}

export function isAllowedForPurpose(type: DetectedFileType, purpose: UploadPurpose) {
  return type.kind === "image" || UPLOAD_PURPOSES[purpose].documents;
}

export function unsupportedTypeMessage(purpose: UploadPurpose) {
  return UPLOAD_PURPOSES[purpose].documents
    ? "Upload an image, PDF, Word, PowerPoint, Excel, ZIP or plain-text file."
    : "Upload a JPEG, PNG, WebP, GIF or AVIF image.";
}

/** The stored name keeps the original base name but always ends in the detected type's extension. */
export function storedFileName(originalName: string, type: DetectedFileType) {
  const base = originalName
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${base || "file"}.${type.extension}`;
}

async function readBytes(blob: Blob, start: number, end: number) {
  return new Uint8Array(await blob.slice(start, end).arrayBuffer());
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

/** AVIF is an ISO-BMFF file whose `ftyp` box lists the avif/avis brand. */
function isAvif(head: Uint8Array) {
  if (head.length < 16 || ascii(head, 4, 8) !== "ftyp") return false;
  const boxSize = new DataView(head.buffer, head.byteOffset, head.byteLength).getUint32(0);
  const end = Math.min(boxSize, head.length);
  for (let offset = 8; offset + 4 <= end; offset += 4) {
    if (offset === 12) continue; // minor version, not a brand
    const brand = ascii(head, offset, offset + 4);
    if (brand === "avif" || brand === "avis") return true;
  }
  return false;
}

const MAX_CENTRAL_DIRECTORY_BYTES = 4 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 20_000;

/** File names from a ZIP's central directory, or null when it can't be read. */
async function zipEntryNames(blob: Blob): Promise<string[] | null> {
  const tailSize = Math.min(blob.size, 22 + 0xffff);
  const tail = await readBytes(blob, blob.size - tailSize, blob.size);
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tail[i] !== 0x50 || tail[i + 1] !== 0x4b || tail[i + 2] !== 0x05 || tail[i + 3] !== 0x06) {
      continue;
    }
    const eocd = new DataView(tail.buffer, tail.byteOffset + i, 22);
    const entries = eocd.getUint16(10, true);
    const size = eocd.getUint32(12, true);
    const offset = eocd.getUint32(16, true);
    if (size > MAX_CENTRAL_DIRECTORY_BYTES || offset + size > blob.size) return null;

    const directory = await readBytes(blob, offset, offset + size);
    const view = new DataView(directory.buffer, directory.byteOffset, directory.byteLength);
    const decoder = new TextDecoder();
    const names: string[] = [];
    let position = 0;
    for (let n = 0; n < Math.min(entries, MAX_ZIP_ENTRIES) && position + 46 <= directory.length; n++) {
      if (view.getUint32(position, true) !== 0x02014b50) break;
      const nameLength = view.getUint16(position + 28, true);
      const extraLength = view.getUint16(position + 30, true);
      const commentLength = view.getUint16(position + 32, true);
      names.push(decoder.decode(directory.subarray(position + 46, position + 46 + nameLength)));
      position += 46 + nameLength + extraLength + commentLength;
    }
    return names;
  }
  return null;
}

async function zipBasedType(blob: Blob): Promise<DetectedFileType> {
  const names = await zipEntryNames(blob);
  // Macro-enabled Office files are kept as plain archives rather than renamed to .docx/.xlsx/.pptx.
  if (!names?.includes("[Content_Types].xml") || names.some((name) => name.endsWith("vbaProject.bin"))) {
    return FILE_TYPES.zip;
  }
  if (names.some((name) => name.startsWith("word/"))) return FILE_TYPES.docx;
  if (names.some((name) => name.startsWith("ppt/"))) return FILE_TYPES.pptx;
  if (names.some((name) => name.startsWith("xl/"))) return FILE_TYPES.xlsx;
  return FILE_TYPES.zip;
}

const TEXT_SAMPLE_BYTES = 64 * 1024;

/** UTF-8 without NULs or control characters (tabs, newlines and form feeds aside). */
function isPlainText(sample: Uint8Array, truncated: boolean) {
  for (const byte of sample) {
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0c && byte !== 0x0d) {
      return false;
    }
    if (byte === 0x7f) return false;
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample, { stream: truncated });
    return true;
  } catch {
    return false;
  }
}

/** Detects the file's real type from its bytes; null when it isn't one we accept. */
export async function detectFileType(blob: Blob): Promise<DetectedFileType | null> {
  if (blob.size === 0) return null;
  const head = await readBytes(blob, 0, Math.min(blob.size, TEXT_SAMPLE_BYTES));

  if (startsWith(head, [0xff, 0xd8, 0xff])) return FILE_TYPES.jpeg;
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return FILE_TYPES.png;
  const six = ascii(head, 0, 6);
  if (six === "GIF87a" || six === "GIF89a") return FILE_TYPES.gif;
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") return FILE_TYPES.webp;
  if (isAvif(head)) return FILE_TYPES.avif;
  if (ascii(head, 0, 5) === "%PDF-") return FILE_TYPES.pdf;
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) return zipBasedType(blob);
  if (isPlainText(head, blob.size > head.length)) return FILE_TYPES.text;
  return null;
}

export type UploadedFile = { url: string };

type UploadAuth =
  | { mode: "server" }
  | {
      mode: "imagekit";
      token: string;
      expire: number;
      signature: string;
      publicKey: string;
      folder: string;
      fileName: string;
      uploadUrl: string;
      urlEndpoint: string;
    };

async function errorMessage(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    error?: unknown;
    message?: unknown;
  } | null;
  if (typeof data?.error === "string" && data.error) return data.error;
  if (typeof data?.message === "string" && data.message) return data.message;
  if (response.status === 413) return "That file is too large to upload.";
  return `Upload failed (${response.status}).`;
}

function isOnEndpoint(value: string, endpoint: string) {
  try {
    const url = new URL(value);
    const base = new URL(`${endpoint.replace(/\/+$/, "")}/`);
    return url.protocol === "https:" && url.origin === base.origin && url.pathname.startsWith(base.pathname);
  } catch {
    return false;
  }
}

async function uploadThroughServer(file: File, purpose: UploadPurpose): Promise<UploadedFile> {
  const form = new FormData();
  form.set("file", file);
  form.set("provider", "imagekit");
  form.set("purpose", purpose);

  const response = await fetch("/api/upload", { method: "POST", body: form });
  if (!response.ok) throw new Error(await errorMessage(response));

  const data = (await response.json().catch(() => null)) as {
    upload?: { url?: unknown };
  } | null;
  if (typeof data?.upload?.url !== "string") {
    throw new Error("The file uploaded, but no URL was returned.");
  }
  return { url: data.upload.url };
}

/**
 * Uploads a file for `purpose` and returns its public URL. Goes straight to
 * ImageKit when it's configured (so large files skip the serverless body
 * limit), otherwise through /api/upload. Throws with a readable message.
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<UploadedFile> {
  const type = await detectFileType(file);
  if (!type || !isAllowedForPurpose(type, purpose)) {
    throw new Error(unsupportedTypeMessage(purpose));
  }

  const params = new URLSearchParams({
    purpose,
    fileName: file.name,
    fileType: type.mime,
    size: String(file.size),
  });
  const authResponse = await fetch(`/api/upload/imagekit-auth?${params}`, { cache: "no-store" });
  if (!authResponse.ok) throw new Error(await errorMessage(authResponse));
  const auth = (await authResponse.json()) as UploadAuth;
  if (auth.mode !== "imagekit") return uploadThroughServer(file, purpose);

  const form = new FormData();
  form.set("file", file);
  form.set("fileName", auth.fileName);
  form.set("folder", auth.folder);
  form.set("useUniqueFileName", "true");
  form.set("publicKey", auth.publicKey);
  form.set("signature", auth.signature);
  form.set("expire", String(auth.expire));
  form.set("token", auth.token);

  const response = await fetch(auth.uploadUrl, { method: "POST", body: form });
  if (!response.ok) throw new Error(await errorMessage(response));

  const data = (await response.json().catch(() => null)) as { url?: unknown } | null;
  if (typeof data?.url !== "string" || !isOnEndpoint(data.url, auth.urlEndpoint)) {
    throw new Error("The upload finished, but the file URL wasn't recognized.");
  }
  return { url: data.url };
}
