import { errorMessage, safeFileName } from "@/lib/api";
import { isLocalUploadEnabled, uploadToLocalDisk } from "@/lib/local-upload";

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

export async function uploadMediaFile(file: File, folder: string): Promise<UploadResult> {
  if (isImageKitConfigured()) {
    return uploadToImageKit(file, folder);
  }
  if (isLocalUploadEnabled()) {
    return uploadToLocalDisk(file, folder);
  }
  throw new Error(
    "IMAGEKIT_PRIVATE_KEY is not configured. Add ImageKit keys to .env or see README.",
  );
}

async function parseProviderError(response: Response) {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || `Upload failed (${response.status})`;
  } catch {
    return body.slice(0, 500) || `Upload failed (${response.status})`;
  }
}

export async function uploadToImageKit(file: File, folder: string): Promise<UploadResult> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not configured");
  const form = new FormData();
  form.set("file", file);
  form.set("fileName", safeFileName(file.name));
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

export async function uploadToYouTube(file: File, title: string, description: string): Promise<UploadResult> {
  const token = await getYouTubeAccessToken();
  const metadata = JSON.stringify({
      snippet: { title: title.slice(0, 100), description: description.slice(0, 5_000), categoryId: "27" },
      status: { privacyStatus: "unlisted", embeddable: true, selfDeclaredMadeForKids: false },
    });
  const initiation = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable&notifySubscribers=false", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(file.size),
      "X-Upload-Content-Type": file.type || "application/octet-stream",
    },
    body: metadata,
  });
  if (!initiation.ok) throw new Error(await parseProviderError(initiation));
  const uploadUrl = initiation.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL");
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Content-Length": String(file.size),
    },
    body: file,
  });
  if (!response.ok) throw new Error(await parseProviderError(response));
  const result = (await response.json()) as { id?: string; snippet?: { title?: string; thumbnails?: { high?: { url?: string } } } };
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
