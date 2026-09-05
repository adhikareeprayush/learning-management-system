import {
  cleanString,
  finiteNumber,
  isTeacher,
  jsonError,
  requireSession,
  requireTenantApi,
} from "@/lib/api";
import {
  createYouTubeResumableSession,
  isYouTubeConfigured,
  mediaError,
} from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Start a YouTube resumable session; client PUTs the file to Google. */
export async function POST(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session, tenant.member)) {
    return jsonError("Only instructors can upload lesson videos", 403);
  }
  if (!isYouTubeConfigured()) {
    return jsonError(
      "YouTube is not configured on the server. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REFRESH_TOKEN (Production OAuth consent).",
      503,
    );
  }

  try {
    const body = await request.json();
    const title = cleanString(body.title, 100) || "Lesson video";
    const description = cleanString(body.description, 5_000);
    const contentType =
      cleanString(body.contentType, 120) || "application/octet-stream";
    const contentLength = finiteNumber(body.contentLength, 0);
    const max = Number(process.env.YOUTUBE_MAX_UPLOAD_MB || 500) * 1024 * 1024;

    if (!contentLength || contentLength <= 0) {
      return jsonError("contentLength is required", 400);
    }
    if (contentLength > max) {
      return jsonError("Video exceeds the configured upload limit", 413);
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      null;

    const sessionResult = await createYouTubeResumableSession({
      title,
      description,
      contentType,
      contentLength,
      origin,
    });

    return Response.json({
      uploadUrl: sessionResult.uploadUrl,
      maxBytes: max,
    });
  } catch (error) {
    return jsonError(mediaError(error), 502);
  }
}
