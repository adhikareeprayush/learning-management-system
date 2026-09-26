import { getImagekitEndpoint } from "@/lib/imagekit-url";

/**
 * Validation for user-supplied URLs before they're stored and rendered.
 *
 * - image / file: something this app uploaded (ImageKit endpoint or /uploads/),
 *   plus the bundled /images/ assets for images.
 * - video: YouTube, or a file this app uploaded.
 * - link: any http(s) URL (external reading for lesson resources).
 */
export type MediaUrlKind = "image" | "video" | "file" | "link";

export type MediaUrlResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

const MAX_URL_LENGTH = 2048;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
]);

function parse(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isOwnUpload(url: URL) {
  const endpoint = getImagekitEndpoint();
  const imagekit = endpoint ? parse(`${endpoint}/`) : null;
  if (imagekit && url.origin === imagekit.origin && url.pathname.startsWith(imagekit.pathname)) {
    return true;
  }
  const appOrigins = [process.env.NEXT_PUBLIC_APP_URL, process.env.BETTER_AUTH_URL]
    .map((origin) => (origin?.trim() ? parse(origin.trim())?.origin : null))
    .filter(Boolean);
  return appOrigins.includes(url.origin) && url.pathname.startsWith("/uploads/");
}

const LABELS: Record<MediaUrlKind, string> = {
  image: "Image",
  video: "Video",
  file: "File",
  link: "Link",
};

/** Empty input is valid and normalizes to null. */
export function parseMediaUrl(value: unknown, kind: MediaUrlKind): MediaUrlResult {
  if (value === null || value === undefined) return { ok: true, url: null };
  if (typeof value !== "string") return { ok: false, error: `${LABELS[kind]} URL must be text` };

  const trimmed = value.trim();
  if (!trimmed) return { ok: true, url: null };
  if (trimmed.length > MAX_URL_LENGTH) {
    return { ok: false, error: `${LABELS[kind]} URL is too long` };
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    const local =
      trimmed.startsWith("/uploads/") ||
      (kind === "image" && trimmed.startsWith("/images/"));
    return local && kind !== "link"
      ? { ok: true, url: trimmed }
      : { ok: false, error: `${LABELS[kind]} URL must be a full https:// address` };
  }

  const url = parse(trimmed);
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
    return { ok: false, error: `${LABELS[kind]} URL must start with https://` };
  }
  if (url.username || url.password) {
    return { ok: false, error: `${LABELS[kind]} URL can't contain credentials` };
  }

  const allowed =
    kind === "link" ||
    isOwnUpload(url) ||
    (kind === "video" && YOUTUBE_HOSTS.has(url.hostname.toLowerCase()));

  if (!allowed) {
    return {
      ok: false,
      error:
        kind === "video"
          ? "Video must be a YouTube link or an uploaded file"
          : `${LABELS[kind]} must be uploaded here rather than linked from another site`,
    };
  }
  return { ok: true, url: url.toString() };
}
