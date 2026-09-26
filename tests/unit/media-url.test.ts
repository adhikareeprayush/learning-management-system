import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseMediaUrl } from "@/lib/media-url";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", "https://ik.imagekit.io/demo");
  vi.stubEnv("IMAGEKIT_URL_ENDPOINT", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://lms.example.com");
  vi.stubEnv("BETTER_AUTH_URL", "");
});

describe("parseMediaUrl", () => {
  it("normalizes empty values to null", () => {
    for (const value of [null, undefined, "", "   "]) {
      expect(parseMediaUrl(value, "image")).toEqual({ ok: true, url: null });
    }
  });

  it("rejects non-string and overly long values", () => {
    expect(parseMediaUrl(42, "image").ok).toBe(false);
    expect(parseMediaUrl(`https://ik.imagekit.io/demo/${"a".repeat(2100)}`, "image").ok).toBe(false);
  });

  it("accepts files uploaded to the configured ImageKit endpoint", () => {
    expect(parseMediaUrl("https://ik.imagekit.io/demo/avatars/a.png", "image")).toEqual({
      ok: true,
      url: "https://ik.imagekit.io/demo/avatars/a.png",
    });
    expect(parseMediaUrl("https://ik.imagekit.io/demo/docs/a.pdf", "file").ok).toBe(true);
  });

  it("rejects other ImageKit accounts and other hosts for uploads", () => {
    expect(parseMediaUrl("https://ik.imagekit.io/someone-else/a.png", "image").ok).toBe(false);
    expect(parseMediaUrl("https://ik.imagekit.io/demox/a.png", "image").ok).toBe(false);
    expect(parseMediaUrl("https://evil.example/a.png", "image").ok).toBe(false);
  });

  it("accepts local upload paths and bundled images", () => {
    expect(parseMediaUrl("/uploads/avatars/a.png", "image")).toEqual({ ok: true, url: "/uploads/avatars/a.png" });
    expect(parseMediaUrl("/images/courses/1.png", "image").ok).toBe(true);
    expect(parseMediaUrl("/images/courses/1.png", "file").ok).toBe(false);
    expect(parseMediaUrl("/uploads/a.png", "link").ok).toBe(false);
  });

  it("accepts uploads on the app's own origin", () => {
    expect(parseMediaUrl("https://lms.example.com/uploads/a.png", "image").ok).toBe(true);
    expect(parseMediaUrl("https://lms.example.com/other/a.png", "image").ok).toBe(false);
  });

  it("rejects protocol-relative, non-http and credentialed URLs", () => {
    expect(parseMediaUrl("//evil.example/a.png", "image").ok).toBe(false);
    expect(parseMediaUrl("javascript:alert(1)", "link").ok).toBe(false);
    expect(parseMediaUrl("ftp://ik.imagekit.io/demo/a.png", "image").ok).toBe(false);
    expect(parseMediaUrl("https://user:pw@ik.imagekit.io/demo/a.png", "image").ok).toBe(false);
  });

  it("allows YouTube only for videos", () => {
    expect(parseMediaUrl("https://www.youtube.com/watch?v=abc", "video").ok).toBe(true);
    expect(parseMediaUrl("https://youtu.be/abc", "video").ok).toBe(true);
    expect(parseMediaUrl("https://youtu.be/abc", "image").ok).toBe(false);
    expect(parseMediaUrl("https://vimeo.com/1", "video").ok).toBe(false);
  });

  it("allows any http(s) URL for links", () => {
    expect(parseMediaUrl("https://developer.mozilla.org/en-US/", "link").ok).toBe(true);
  });
});
