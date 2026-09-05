import "dotenv/config";

async function main() {
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("Missing YouTube env vars.");
    console.error("Required: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN");
    console.error("\nGenerate a refresh token with: pnpm youtube:setup");
    process.exit(1);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const body = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !body.access_token) {
    console.error("YouTube OAuth failed:", body.error_description ?? body.error ?? response.status);
    if (body.error === "invalid_grant") {
      console.error("\nYour refresh token is expired or revoked.");
      console.error("Run: pnpm youtube:setup");
      console.error("\nImportant: In Google Cloud → OAuth consent screen, publish the app to Production.");
      console.error("Testing mode refresh tokens expire after 7 days.");
    }
    if (body.error === "unauthorized_client") {
      console.error("\nThe refresh token was not issued for this OAuth client.");
      console.error("Run: pnpm youtube:setup using the same Client ID/Secret in .env");
    }
    process.exit(1);
  }

  console.log("YouTube OAuth OK — access token received.");
  console.log("Lesson video uploads should work via YouTube.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
