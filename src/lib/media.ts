import { createHmac, randomUUID } from "node:crypto";
import { errorMessage } from "@/lib/api";
import { getImagekitEndpoint } from "@/lib/imagekit-url";
import { isLocalUploadEnabled, uploadToLocalDisk } from "@/lib/local-upload";
import { storedFileName, type DetectedFileType } from "@/lib/upload-client";

export { isLocalUploadEnabled };

type UploadResult = {
  provider: "imagekit" | "youtube" | "local";
  url: string;
  fileId: string;
  name: string;
  thumbnailUrl?: string;
};

export function isImageKitConfigured() {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY?.trim());
}

/** Browser uploads go straight to ImageKit; they also need the public key and URL endpoint. */
export function isImageKitDirectUploadConfigured() {
  return Boolean(
    isImageKitConfigured() && process.env.IMAGEKIT_PUBLIC_KEY?.trim() && getImagekitEndpoint(),
  );
}

export const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

/** Upload size limit for ImageKit and local uploads, in bytes. */
export function maxUploadBytes() {
  const mb = Number(process.env.IMAGEKIT_MAX_UPLOAD_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 25) * 1024 * 1024;
}

/**
 * One-time client-upload credentials: signature = HMAC-SHA1(privateKey, token + expire),
 * hex (same as the official SDK's getAuthenticationParameters). ImageKit rejects a
 * reused token and requires `expire` less than an hour ahead.
 */
export function createImageKitUploadAuth(ttlSeconds = 30 * 60) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim();
  if (!privateKey || !publicKey) throw new Error("ImageKit keys are not configured");
  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createHmac("sha1", privateKey).update(token + expire).digest("hex");
  return { token, expire, signature, publicKey };
}

export function isYouTubeConfigured() {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID?.trim() &&
      process.env.YOUTUBE_CLIENT_SECRET?.trim() &&
      process.env.YOUTUBE_REFRESH_TOKEN?.trim(),
  );
}

/** `type` is what detectFileType() found in the bytes; it decides the stored extension. */
export async function uploadMediaFile(
  file: File,
  folder: string,
  type: DetectedFileType,
): Promise<UploadResult> {
  if (isImageKitConfigured()) {
    return uploadToImageKit(file, folder, type);
  }
  if (isLocalUploadEnabled()) {
    return uploadToLocalDisk(file, folder, type);
  }
  throw new Error(
    "IMAGEKIT_PRIVATE_KEY is not configured. Add ImageKit keys to .env or see README.",
  );
}

async function parseProviderError(response: Response) {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as {
      error?: string | { message?: string };
      error_description?: string;
      message?: string;
    };
    const nested =
      typeof parsed.error === "object" && parsed.error !== null
        ? parsed.error.message
        : undefined;
    const flat = typeof parsed.error === "string" ? parsed.error : undefined;
    if (flat === "invalid_grant") {
      return "YouTube refresh token expired or revoked. Run: pnpm youtube:setup — and publish your Google OAuth app to Production (Testing mode tokens expire after 7 days).";
    }
    if (flat === "unauthorized_client") {
      return "YouTube OAuth client mismatch. Regenerate the refresh token with the same Client ID and Secret as in your .env.";
    }
    return (
      parsed.error_description ||
      nested ||
      (typeof flat === "string" && flat !== "invalid_grant" && flat !== "unauthorized_client"
        ? flat
        : undefined) ||
      parsed.message ||
      `Upload failed (${response.status})`
    );
  } catch {
    return body.slice(0, 500) || `Upload failed (${response.status})`;
  }
}

export async function uploadToImageKit(
  file: File,
  folder: string,
  type: DetectedFileType,
): Promise<UploadResult> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not configured");
  const fileName = storedFileName(file.name, type);
  const form = new FormData();
  form.set("file", new File([file], fileName, { type: type.mime }));
  form.set("fileName", fileName);
  form.set("folder", folder);
  form.set("useUniqueFileName", "true");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
    body: form,
  });
  if (!response.ok) throw new Error(await parseProviderError(response));
  const result = (await response.json()) as { fileId: string; name: string; url: string; thumbnailUrl?: string };
  return { provider: "imagekit", ...result };
}

async function getYouTubeAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YouTube OAuth is not configured");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  if (!response.ok) throw new Error(await parseProviderError(response));
  const result = (await response.json()) as { access_token?: string };
  if (!result.access_token) throw new Error("Google did not return an access token");
  return result.access_token;
}

export async function uploadLessonVideo(
  file: File,
  title: string,
  description: string,
): Promise<UploadResult> {
  if (!isYouTubeConfigured()) {
    throw new Error(
      "YouTube OAuth is not configured. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN, then run pnpm youtube:setup",
    );
  }

  return uploadToYouTube(file, title, description);
}

/**
 * Create a YouTube resumable upload URL.
 * Pass `origin` so the browser can PUT the file directly (needed on Vercel).
 */
export async function createYouTubeResumableSession(input: {
  title: string;
  description: string;
  contentType: string;
  contentLength: number;
  origin?: string | null;
}): Promise<{ uploadUrl: string }> {
  if (!isYouTubeConfigured()) {
    throw new Error(
      "YouTube OAuth is not configured. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN, then run pnpm youtube:setup",
    );
  }

  const token = await getYouTubeAccessToken();
  const metadata = JSON.stringify({
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 5_000),
      categoryId: "27",
    },
    status: {
      privacyStatus: "unlisted",
      embeddable: true,
      selfDeclaredMadeForKids: false,
    },
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Length": String(input.contentLength),
    "X-Upload-Content-Type": input.contentType || "application/octet-stream",
  };
  if (input.origin) {
    headers.Origin = input.origin;
  }

  const initiation = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable&notifySubscribers=false",
    { method: "POST", headers, body: metadata },
  );
  if (!initiation.ok) throw new Error(await parseProviderError(initiation));
  const uploadUrl = initiation.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL");
  return { uploadUrl };
}

export async function uploadToYouTube(file: File, title: string, description: string): Promise<UploadResult> {
  const { uploadUrl } = await createYouTubeResumableSession({
    title,
    description,
    contentType: file.type || "application/octet-stream",
    contentLength: file.size,
  });
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Content-Length": String(file.size),
    },
    body: file,
  });
  if (!response.ok) throw new Error(await parseProviderError(response));
  const result = (await response.json()) as {
    id?: string;
    snippet?: { title?: string; thumbnails?: { high?: { url?: string } } };
  };
  if (!result.id) throw new Error("YouTube did not return a video id");
  return {
    provider: "youtube",
    fileId: result.id,
    name: result.snippet?.title || title,
    url: `https://www.youtube.com/watch?v=${result.id}`,
    thumbnailUrl: result.snippet?.thumbnails?.high?.url,
  };
}

export function mediaError(error: unknown) {
  return errorMessage(error).replace(/(client_secret|refresh_token|private[_ ]?key)[^,}]*/gi, "$1 [redacted]");
}
