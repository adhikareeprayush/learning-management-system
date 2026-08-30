import fs from "node:fs/promises";
import path from "node:path";
import { safeFileName } from "@/lib/api";

type UploadResult = {
  provider: "local";
  url: string;
  fileId: string;
  name: string;
};

/** Dev-only disk storage when ImageKit keys are not configured. */
export async function uploadToLocalDisk(file: File, folder: string): Promise<UploadResult> {
  const sanitizedFolder = folder.replace(/^\/+/, "").replace(/\.\./g, "");
  const uploadsRoot = path.join(process.cwd(), "public", "uploads", sanitizedFolder);
  await fs.mkdir(uploadsRoot, { recursive: true });

  const fileName = `${Date.now()}-${safeFileName(file.name)}`;
  const absolutePath = path.join(uploadsRoot, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  const publicPath = `/uploads/${sanitizedFolder}/${fileName}`.replace(/\/+/g, "/");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3005";

  return {
    provider: "local",
    url: `${baseUrl.replace(/\/$/, "")}${publicPath}`,
    fileId: publicPath,
    name: fileName,
  };
}

export function isLocalUploadEnabled() {
  return process.env.NODE_ENV !== "production" && !process.env.IMAGEKIT_PRIVATE_KEY?.trim();
}
