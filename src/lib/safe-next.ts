// Pure helpers shared by server pages, client forms and the proxy.

/** Set by src/proxy.ts on dashboard requests: the path to return to after login. */
export const RETURN_PATH_HEADER = "x-lms-path";

const BASE = "http://local.invalid";

function isProtocolRelative(path: string) {
  return path.startsWith("//") || path.startsWith("/\\");
}

/**
 * Returns `next` as a same-origin path, or null. "//host" and "/\host" are
 * protocol-relative; browsers strip tabs/newlines, so "/<tab>/host" would
 * become "//host" too; and dot segments can normalize "/.//host" into "//host",
 * so the normalized result is checked again.
 */
export function safeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || isProtocolRelative(next)) return null;
  for (const char of next) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return null;
  }
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return null;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return isProtocolRelative(path) ? null : path;
  } catch {
    return null;
  }
}

type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

/** First value of a search param from a page's `searchParams` or URLSearchParams. */
export function firstParam(source: ParamSource, key: string) {
  if (source instanceof URLSearchParams) return source.get(key);
  const value = source[key];
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

const FORWARDED_PARAMS = ["enroll", "roadmap", "slug"] as const;

/** Link between /login and /register that keeps the return path and any pending enrollment. */
export function authPageHref(path: "/login" | "/register", source: ParamSource) {
  const params = new URLSearchParams();
  const next = safeNextPath(firstParam(source, "next"));
  if (next) params.set("next", next);
  for (const key of FORWARDED_PARAMS) {
    const value = firstParam(source, key);
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
