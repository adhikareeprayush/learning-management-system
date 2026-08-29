import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

type UploadResult = {
  fileId: string;
  name: string;
  url: string;
};

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function uploadToImageKit(filePath: string, folder: string) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("IMAGEKIT_PRIVATE_KEY is required to sync static assets.");
  }

  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const form = new FormData();
  form.set("file", new Blob([buffer]), fileName);
  form.set("fileName", fileName);
  form.set("folder", folder);
  form.set("useUniqueFileName", "false");
  form.set("overwriteFile", "true");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upload failed for ${filePath}: ${body.slice(0, 400)}`);
  }

  return (await response.json()) as UploadResult;
}

async function main() {
  const imagesRoot = path.join(process.cwd(), "public/images");
  if (!fs.existsSync(imagesRoot)) {
    throw new Error(`Missing ${imagesRoot}`);
  }

  const endpoint =
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT?.trim() ||
    process.env.IMAGEKIT_URL_ENDPOINT?.trim();
  if (!endpoint) {
    throw new Error(
      "Set NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT (or IMAGEKIT_URL_ENDPOINT) before syncing assets.",
    );
  }

  const files = walkFiles(imagesRoot);
  console.log(`Uploading ${files.length} files to ImageKit…`);

  for (const filePath of files) {
    const relative = path.relative(imagesRoot, filePath).replace(/\\/g, "/");
    const folder = `/lms/static/${path.posix.dirname(relative)}`.replace(
      /\/\.$/,
      "",
    );
    const result = await uploadToImageKit(filePath, folder === "/lms/static" ? "/lms/static" : folder);
    console.log(`✓ ${relative} → ${result.url}`);
  }

  console.log("\nDone. Static assets are available under:");
  console.log(`${endpoint.replace(/\/$/, "")}/lms/static/`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
