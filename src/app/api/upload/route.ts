import { cleanString, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import {
  isImageKitConfigured,
  isLocalUploadEnabled,
  isYouTubeConfigured,
  maxUploadBytes,
  mediaError,
  uploadLessonVideo,
  uploadMediaFile,
} from "@/lib/media";
import { isOrgAdmin } from "@/lib/tenant";
import {
  UPLOAD_PURPOSES,
  detectFileType,
  isAllowedForPurpose,
  isUploadPurpose,
  unsupportedTypeMessage,
  type UploadPurpose,
} from "@/lib/upload-client";

export const runtime = "nodejs";

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
]);

// Multipart boundaries and the other form fields on top of the file itself.
const FORM_OVERHEAD_BYTES = 64 * 1024;

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || VIDEO_TYPES.has(file.type);
}

function youtubeMaxBytes() {
  return Number(process.env.YOUTUBE_MAX_UPLOAD_MB || 500) * 1024 * 1024;
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

  // Refuse oversized bodies before buffering them. Proxied video uploads (never on Vercel) get the larger YouTube limit.
  const largestAllowed = Math.max(
    maxUploadBytes(),
    process.env.VERCEL === "1" || !isTeacher(session, tenant.member) ? 0 : youtubeMaxBytes(),
  );
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > largestAllowed + FORM_OVERHEAD_BYTES) {
    return jsonError("File exceeds the configured upload limit", 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Send the file as multipart/form-data", 400);
  }
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
    if (file.size > youtubeMaxBytes()) return jsonError("Video exceeds the configured upload limit", 413);
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

  const isAdmin = session.user.role === "ADMIN" || isOrgAdmin(tenant.member);
  const canTeach = isAdmin || isTeacher(session, tenant.member);

  // Callers that don't say what the upload is for get the historical folder for their role.
  const requestedPurpose = cleanString(form.get("purpose"), 40);
  if (requestedPurpose && !isUploadPurpose(requestedPurpose)) {
    return jsonError("Unsupported upload purpose", 400);
  }
  const purpose: UploadPurpose =
    requestedPurpose && isUploadPurpose(requestedPurpose)
      ? requestedPurpose
      : isAdmin
        ? "payment-qr"
        : canTeach
          ? "lesson-resource"
          : "submission";
  const rule = UPLOAD_PURPOSES[purpose];
  if (
    (rule.access === "admin" && !isAdmin) ||
    (rule.access === "teacher" && !canTeach)
  ) {
    return jsonError("You can't upload files for this purpose", 403);
  }

  if (file.size > maxUploadBytes()) return jsonError("File exceeds the configured upload limit", 413);

  // The declared type and file name come from the client; only the bytes decide.
  const type = await detectFileType(file);
  if (!type || !isAllowedForPurpose(type, purpose)) {
    return jsonError(unsupportedTypeMessage(purpose), 415);
  }

  const folder = `/lms/${tenant.organizationId}/${rule.folder}`;

  try {
    const result = await uploadMediaFile(file, folder, type);
    return Response.json({ upload: result }, { status: 201 });
  } catch (error) {
    return jsonError(mediaError(error), 502);
  }
}
