import { cleanString, isTeacher, jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { getImagekitEndpoint } from "@/lib/imagekit-url";
import {
  IMAGEKIT_UPLOAD_URL,
  createImageKitUploadAuth,
  isImageKitConfigured,
  isImageKitDirectUploadConfigured,
  isLocalUploadEnabled,
  maxUploadBytes,
  mediaError,
} from "@/lib/media";
import { isOrgAdmin } from "@/lib/tenant";
import {
  UPLOAD_PURPOSES,
  fileTypeForMime,
  isAllowedForPurpose,
  isUploadPurpose,
  storedFileName,
  unsupportedTypeMessage,
} from "@/lib/upload-client";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Credentials for one browser upload straight to ImageKit, after the same
 * purpose / role / type / size checks as POST /api/upload. `fileType` is the
 * type uploadFile() detected from the bytes. Answers `{ mode: "server" }` when
 * the file should go through POST /api/upload instead (local dev storage).
 */
export async function GET(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const params = new URL(request.url).searchParams;
  const purpose = cleanString(params.get("purpose"), 40);
  if (!isUploadPurpose(purpose)) return jsonError("Unsupported upload purpose", 400);

  const rule = UPLOAD_PURPOSES[purpose];
  const isAdmin = session.user.role === "ADMIN" || isOrgAdmin(tenant.member);
  const canTeach = isAdmin || isTeacher(session, tenant.member);
  if (
    (rule.access === "admin" && !isAdmin) ||
    (rule.access === "teacher" && !canTeach)
  ) {
    return jsonError("You can't upload files for this purpose", 403);
  }

  const type = fileTypeForMime(cleanString(params.get("fileType"), 120));
  if (!type || !isAllowedForPurpose(type, purpose)) {
    return jsonError(unsupportedTypeMessage(purpose), 415);
  }

  const size = Number(params.get("size"));
  if (!Number.isInteger(size) || size <= 0) return jsonError("size is required", 400);
  if (size > maxUploadBytes()) return jsonError("File exceeds the configured upload limit", 413);

  if (!isImageKitDirectUploadConfigured()) {
    if (isImageKitConfigured() || isLocalUploadEnabled()) {
      return Response.json({ mode: "server" }, { headers: NO_STORE });
    }
    return jsonError("File uploads are not configured on the server", 503);
  }

  try {
    return Response.json(
      {
        mode: "imagekit",
        ...createImageKitUploadAuth(),
        folder: `/lms/${tenant.organizationId}/${rule.folder}`,
        fileName: storedFileName(cleanString(params.get("fileName"), 255), type),
        uploadUrl: IMAGEKIT_UPLOAD_URL,
        urlEndpoint: getImagekitEndpoint(),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return jsonError(mediaError(error), 500);
  }
}
