const LOCAL_IMAGES_PREFIX = "/images/";

export function getImagekitEndpoint() {
  const value =
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT?.trim() ||
    process.env.IMAGEKIT_URL_ENDPOINT?.trim() ||
    "";
  return value.replace(/\/$/, "");
}

export function isRemoteMediaUrl(url: string) {
  return /^https?:\/\//i.test(url) || url.includes("ik.imagekit.io");
}

export function isLocalUploadUrl(url: string) {
  return url.startsWith("/uploads/") || url.includes("/uploads/");
}

/** Map a local `/images/...` path to ImageKit. Remote URLs pass through unchanged. */
export function imagekitAsset(localOrRemotePath: string): string {
  if (!localOrRemotePath) return localOrRemotePath;
  if (isRemoteMediaUrl(localOrRemotePath) || isLocalUploadUrl(localOrRemotePath)) {
    return localOrRemotePath;
  }

  const endpoint = getImagekitEndpoint();
  if (!endpoint) return localOrRemotePath;

  const normalized = localOrRemotePath.startsWith(LOCAL_IMAGES_PREFIX)
    ? localOrRemotePath.slice(LOCAL_IMAGES_PREFIX.length)
    : localOrRemotePath.replace(/^\//, "");

  return `${endpoint}/lms/static/${normalized}`;
}

export const DEFAULT_COURSE_THUMBNAIL_PATH = "/images/courses/1.png";

export function resolveMediaUrl(
  url: string | null | undefined,
  fallback: string = DEFAULT_COURSE_THUMBNAIL_PATH,
) {
  const path = url?.trim() || fallback;
  return imagekitAsset(path);
}
