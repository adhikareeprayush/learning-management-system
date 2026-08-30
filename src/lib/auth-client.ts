import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

function resolveAuthBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3005"
  );
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  plugins: [inferAdditionalFields<typeof auth>()],
});
