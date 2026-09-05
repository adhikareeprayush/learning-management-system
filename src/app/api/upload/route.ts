import { cleanString, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import {
  isImageKitConfigured,
  isLocalUploadEnabled,
  isYouTubeConfigured,
  mediaError,
  uploadLessonVideo,
  uploadMediaFile,
} from "@/lib/media";
import { isOrgAdmin } from "@/lib/tenant";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const DOCUMENT_TYPES = new Set(["application/pdf", "text/plain", "application/zip"]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
]);

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || VIDEO_TYPES.has(file.type);
}

export async function GET() {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  return Response.json({
    providers: {
      imagekit: isImageKitConfigured(),
      local: isLocalUploadEnabled(),
      youtube: isYouTubeConfigured(),
    },
  });
}

export async function POST(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return jsonError("file is required", 400);
  const requestedProvider = cleanString(form.get("provider"), 20);
  const isVideo = isVideoFile(file);
  const provider = requestedProvider || (isVideo ? "youtube" : "imagekit");

  if (provider === "youtube") {
    // Large videos must use /api/upload/youtube/session on Vercel.
    if (process.env.VERCEL === "1") {
      return jsonError(
        "Use the direct YouTube upload flow (/api/upload/youtube/session). Proxying video through this route is not supported on Vercel.",
        400,
      );
    }
    if (!isTeacher(session, tenant.member)) {
      return jsonError("Only instructors can upload lesson videos", 403);
    }
    if (!isVideo) return jsonError("Video uploads must be video files", 400);
    const max = Number(process.env.YOUTUBE_MAX_UPLOAD_MB || 500) * 1024 * 1024;
    if (file.size > max) return jsonError("Video exceeds the configured upload limit", 413);
    try {
      const title = cleanString(form.get("title"), 100) || file.name;
      const description = cleanString(form.get("description"), 5_000);
      const result = await uploadLessonVideo(file, title, description);
      return Response.json({ upload: result }, { status: 201 });
    } catch (error) {
      return jsonError(mediaError(error), 502);
    }
  }

  if (provider !== "imagekit") return jsonError("Unsupported upload provider", 400);
  if (!IMAGE_TYPES.has(file.type) && !DOCUMENT_TYPES.has(file.type) && !isVideo) {
    return jsonError("Unsupported file type", 415);
  }
  const max = Number(process.env.IMAGEKIT_MAX_UPLOAD_MB || 25) * 1024 * 1024;
  if (file.size > max) return jsonError("File exceeds the configured upload limit", 413);

  const orgPrefix = `/lms/${tenant.organizationId}`;
  const role = session.user.role;
  const isAdmin = role === "ADMIN" || isOrgAdmin(tenant.member);
  const isStudent =
    role === "STUDENT" ||
    (!isAdmin &&
      role !== "INSTRUCTOR" &&
      (tenant.member?.role === "STUDENT" || !tenant.member));
  const folder = isAdmin
    ? `${orgPrefix}/payment-assets`
    : isStudent
      ? `${orgPrefix}/submissions`
      : `${orgPrefix}/course-assets`;

  try {
    const result = await uploadMediaFile(file, folder);
    return Response.json({ upload: result }, { status: 201 });
  } catch (error) {
    return jsonError(mediaError(error), 502);
  }
}
