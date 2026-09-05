import "dotenv/config";
import http from "node:http";
import { URL } from "node:url";

const REDIRECT_URI = "http://localhost:8765/oauth2callback";
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name} in .env`);
    process.exit(1);
  }
  return value;
}

async function exchangeCode(code: string, clientId: string, clientSecret: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(body.error_description ?? body.error ?? `Token exchange failed (${response.status})`);
  }

  return body;
}

async function main() {
  const clientId = requiredEnv("YOUTUBE_CLIENT_ID");
  const clientSecret = requiredEnv("YOUTUBE_CLIENT_SECRET");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  // Do not set include_granted_scopes — it can merge old scopes (e.g. drive.file
  // from N8N) with youtube.upload, which Google rejects as incompatible.

  console.log("\nYouTube OAuth setup\n");
  console.log("Before continuing, confirm in Google Cloud Console:");
  console.log("  1. YouTube Data API v3 is enabled");
  console.log("  2. OAuth client redirect URI includes:");
  console.log(`     ${REDIRECT_URI}`);
  console.log("  3. OAuth consent screen is Published to Production");
  console.log("     (Testing mode refresh tokens expire after 7 days)");
  console.log("  4. Use a dedicated OAuth client for this LMS (not N8N/shared clients)");
  console.log("  5. Revoke old access if you see scope errors:");
  console.log("     https://myaccount.google.com/permissions\n");

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith("/oauth2callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const url = new URL(req.url, REDIRECT_URI);
      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h1>Authorization failed</h1><p>${error}</p><p>You can close this tab.</p>`);
        server.close();
        reject(new Error(error));
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>Missing authorization code</h1><p>You can close this tab.</p>");
        return;
      }

      try {
        const tokens = await exchangeCode(code, clientId, clientSecret);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>YouTube connected</h1><p>Refresh token received. Return to your terminal.</p><p>You can close this tab.</p>",
        );
        server.close();

        if (!tokens.refresh_token) {
          console.error(
            "\nGoogle did not return a refresh_token. Revoke app access at https://myaccount.google.com/permissions and run this script again.",
          );
          process.exit(1);
        }

        console.log("\nSuccess. Add this to .env and Vercel:\n");
        console.log(`YOUTUBE_REFRESH_TOKEN="${tokens.refresh_token}"\n`);
        console.log("Verify with: pnpm youtube:verify\n");
        resolve();
      } catch (exchangeError) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>Token exchange failed</h1><p>Check your terminal for details.</p>");
        server.close();
        reject(exchangeError);
      }
    });

    server.listen(8765, () => {
      console.log("Open this URL in your browser and sign in with the YouTube channel owner account:\n");
      console.log(authUrl.toString());
      console.log("\nWaiting for Google to redirect back to localhost:8765 …\n");
    });

    server.on("error", reject);
  });
}

main().catch((error) => {
  console.error("\nSetup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
