import type { MetadataRoute } from "next";
import { getInstituteProfile } from "@/lib/institute";

export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { name } = await getInstituteProfile();

  return {
    name,
    // Home screens truncate long labels; fall back to the first word.
    short_name: name.length <= 12 ? name : name.split(/\s+/)[0],
    description: `Courses, learning paths, and verifiable certificates from ${name}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#04016C",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/images/logo/mark.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
