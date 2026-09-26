import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { storedFileName, type DetectedFileType } from "@/lib/upload-client";

type UploadResult = {
  provider: "local";
  url: string;
  fileId: string;
  name: string;
};

/** Dev-only disk storage when ImageKit keys are not configured. */
export async function uploadToLocalDisk(
  file: File,
  folder: string,
  type: DetectedFileType,
): Promise<UploadResult> {
  const publicRoot = path.join(process.cwd(), "public", "uploads");
  const uploadsRoot = path.resolve(publicRoot, folder.replace(/^\/+/, ""));
  if (!uploadsRoot.startsWith(publicRoot + path.sep)) {
    throw new Error("Invalid upload folder");
  }
  await fs.mkdir(uploadsRoot, { recursive: true });

  // The extension comes from the detected type, never from the client's file name.
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${storedFileName(file.name, type)}`;
  const absolutePath = path.join(uploadsRoot, fileName);
  await fs.writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  const publicPath = `/uploads/${path.relative(publicRoot, absolutePath).split(path.sep).join("/")}`;

  // Relative so next/image treats it as a local asset (remotePatterns only allows ImageKit).
  return {
    provider: "local",
    url: publicPath,
    fileId: publicPath,
    name: fileName,
  };
}

export function isLocalUploadEnabled() {
  return process.env.NODE_ENV !== "production" && !process.env.IMAGEKIT_PRIVATE_KEY?.trim();
}
