import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getInstituteProfile } from "@/lib/institute";

export const alt = "Online courses, learning paths, and verifiable certificates";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Prerendered, then refreshed hourly so an institute rename shows up without a redeploy.
export const revalidate = 3600;

async function loadBrandFont() {
  try {
    return await readFile(
      join(process.cwd(), "assets/certificate-fonts/sora-latin-600-normal.woff"),
    );
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [{ name }, font] = await Promise.all([
    getInstituteProfile(),
    loadBrandFont(),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#ffffff",
          backgroundColor: "#04016C",
          backgroundImage:
            "linear-gradient(135deg, #04016C 0%, #083f9b 58%, #1a0b4e 100%)",
          fontFamily: font ? "Sora" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 48 48" fill="none">
            <g stroke="#4BE5CA" strokeWidth="1.6" strokeOpacity="0.5">
              <line x1="11" y1="11" x2="37" y2="17.5" />
              <line x1="11" y1="11" x2="37" y2="30.5" />
              <line x1="11" y1="24" x2="37" y2="17.5" />
              <line x1="11" y1="24" x2="37" y2="30.5" />
              <line x1="11" y1="37" x2="37" y2="17.5" />
              <line x1="11" y1="37" x2="37" y2="30.5" />
            </g>
            <circle cx="11" cy="11" r="4" fill="#ffffff" />
            <circle cx="11" cy="24" r="4" fill="#ffffff" />
            <circle cx="11" cy="37" r="4" fill="#ffffff" />
            <circle cx="37" cy="17.5" r="4.5" fill="#4BE5CA" />
            <circle cx="37" cy="30.5" r="4.5" fill="#4BE5CA" />
          </svg>
          <div style={{ fontSize: 44, letterSpacing: -0.5, maxWidth: 900 }}>
            {name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, lineHeight: 1.05, letterSpacing: -1.5 }}>
            Learn. Practice.
          </div>
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              color: "#4BE5CA",
            }}
          >
            Get certified.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.78)",
          }}
        >
          <div style={{ display: "flex" }}>Courses</div>
          <div style={{ display: "flex", color: "#2AAA94" }}>•</div>
          <div style={{ display: "flex" }}>Learning paths</div>
          <div style={{ display: "flex", color: "#2AAA94" }}>•</div>
          <div style={{ display: "flex" }}>Verifiable certificates</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Sora", data: font, weight: 600, style: "normal" }]
        : undefined,
    },
  );
}
