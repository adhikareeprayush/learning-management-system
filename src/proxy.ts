import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { RETURN_PATH_HEADER } from "@/lib/safe-next";

/**
 * Optimistic check only (no database): signed-out visitors go straight to the
 * login page with a return path. Layouts and page guards do the real check and
 * read the header below to build the same return path when a cookie turns out
 * to be stale.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const path = `${pathname}${search}`;

  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  const headers = new Headers(request.headers);
  headers.set(RETURN_PATH_HEADER, path);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/student/:path*", "/instructor/:path*", "/admin/:path*"],
};
