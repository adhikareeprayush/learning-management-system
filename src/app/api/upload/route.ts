import { cleanString, isTeacher, jsonError, requireSession } from "@/lib/api";
import { isLocalUploadEnabled, mediaError, uploadMediaFile, uploadToYouTube } from "@/lib/media";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const DOCUMENT_TYPES = new Set(["application/pdf", "text/plain", "application/zip"]);

export async function GET() {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  return Response.json({
    providers: {
      imagekit: Boolean(process.env.IMAGEKIT_PRIVATE_KEY),
      local: isLocalUploadEnabled(),
      youtube: Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REFRESH_TOKEN),
    },
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return jsonError("file is required", 400);
  const requestedProvider = cleanString(form.get("provider"), 20);
  const isVideo = file.type.startsWith("video/");
  const provider = requestedProvider || (isVideo ? "youtube" : "imagekit");

  if (provider === "youtube") {
    if (!isTeacher(session)) return jsonError("Only instructors can upload lesson videos", 403);
    if (!isVideo) return jsonError("YouTube uploads must be video files", 400);
    const max = Number(process.env.YOUTUBE_MAX_UPLOAD_MB || 500) * 1024 * 1024;
    if (file.size > max) return jsonError("Video exceeds the configured upload limit", 413);
    try {
      const result = await uploadToYouTube(file, cleanString(form.get("title"), 100) || file.name, cleanString(form.get("description"), 5_000));
      return Response.json({ upload: result }, { status: 201 });
    } catch (error) {
      return jsonError(mediaError(error), 502);
    }
  }

  if (provider !== "imagekit") return jsonError("Unsupported upload provider", 400);
  if (!IMAGE_TYPES.has(file.type) && !DOCUMENT_TYPES.has(file.type)) return jsonError("Unsupported file type", 415);
  const max = Number(process.env.IMAGEKIT_MAX_UPLOAD_MB || 25) * 1024 * 1024;
  if (file.size > max) return jsonError("File exceeds the configured upload limit", 413);
  const folder =
    session.user.role === "ADMIN"
      ? "/lms/payment-assets"
      : session.user.role === "STUDENT"
        ? "/lms/submissions"
        : "/lms/course-assets";
  try {
    const result = await uploadMediaFile(file, folder);
    return Response.json({ upload: result }, { status: 201 });
  } catch (error) {
    return jsonError(mediaError(error), 502);
  }
}
