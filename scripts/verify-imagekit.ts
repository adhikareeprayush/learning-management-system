import "dotenv/config";

async function main() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim();
  const endpoint =
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT?.trim() ||
    process.env.IMAGEKIT_URL_ENDPOINT?.trim();

  if (!privateKey || !publicKey || !endpoint) {
    console.error("Missing ImageKit env vars. Add to .env:\n");
    console.error("  IMAGEKIT_PUBLIC_KEY=public_...");
    console.error("  IMAGEKIT_PRIVATE_KEY=private_...");
    console.error("  IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id");
    console.error("  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id");
    console.error("\nGet keys: https://imagekit.io/dashboard/developer/api-keys");
    process.exit(1);
  }

  const response = await fetch("https://api.imagekit.io/v1/files?limit=1", {
    headers: {
      Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("ImageKit connection failed:", response.status, body.slice(0, 300));
    process.exit(1);
  }

  console.log("ImageKit connected successfully.");
  console.log({ publicKey: `${publicKey.slice(0, 12)}...`, endpoint });
  console.log("\nNext: pnpm assets:sync-imagekit");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
