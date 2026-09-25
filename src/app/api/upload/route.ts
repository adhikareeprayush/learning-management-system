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

type UploadAccess = "any" | "teacher" | "admin";

/** What the file is for decides its folder, who may upload it, and which types are allowed. */
const UPLOAD_PURPOSES = {
  avatar: { folder: "avatars", access: "any", documents: false, video: false },
  "course-thumbnail": { folder: "course-thumbnails", access: "teacher", documents: false, video: false },
  "lesson-resource": { folder: "lesson-resources", access: "teacher", documents: true, video: true },
  "payment-screenshot": { folder: "payment-screenshots", access: "any", documents: false, video: false },
  "payment-qr": { folder: "payment-assets", access: "admin", documents: false, video: false },
  submission: { folder: "submissions", access: "any", documents: true, video: false },
} satisfies Record<string, { folder: string; access: UploadAccess; documents: boolean; video: boolean }>;

type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

function isUploadPurpose(value: string): value is UploadPurpose {
  return Object.hasOwn(UPLOAD_PURPOSES, value);
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

  const isAdmin = session.user.role === "ADMIN" || isOrgAdmin(tenant.member);
  const canTeach = isAdmin || isTeacher(session, tenant.member);
  if (isVideo && !canTeach) return jsonError("Only instructors can upload videos", 403);

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
  const allowed =
    IMAGE_TYPES.has(file.type) ||
    (rule.documents && DOCUMENT_TYPES.has(file.type)) ||
    (rule.video && isVideo);
  if (!allowed) return jsonError("Unsupported file type", 415);

  const max = Number(process.env.IMAGEKIT_MAX_UPLOAD_MB || 25) * 1024 * 1024;
  if (file.size > max) return jsonError("File exceeds the configured upload limit", 413);

  const folder = `/lms/${tenant.organizationId}/${rule.folder}`;

  try {
    const result = await uploadMediaFile(file, folder);
    return Response.json({ upload: result }, { status: 201 });
  } catch (error) {
    return jsonError(mediaError(error), 502);
  }
}
