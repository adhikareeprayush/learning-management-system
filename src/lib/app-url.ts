/** Absolute URL for links that leave the app (emails, sitemaps, certificates). */
export function appUrl(path = "") {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3005"
  ).replace(/\/+$/, "");

  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
