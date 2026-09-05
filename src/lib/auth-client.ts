import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.BETTER_AUTH_URL?.trim() ||
        "http://localhost:3005",
  plugins: [inferAdditionalFields<typeof auth>()],
});
