import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

function originOf(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

// Uploaded images/videos may live on a custom ImageKit domain.
const imagekitOrigins = [
  ...new Set(
    [
      "https://ik.imagekit.io",
      originOf(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT),
      originOf(process.env.IMAGEKIT_URL_ENDPOINT),
    ].filter(Boolean),
  ),
].join(" ");

const youtubeFrames = "https://www.youtube.com https://www.youtube-nocookie.com";

// Next's inline bootstrap scripts need 'unsafe-inline' (no nonces without the
// proxy); React's dev tooling needs 'unsafe-eval' in development only.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.youtube.com https://s.ytimg.com`,
  // ApexCharts and next/image set inline styles.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imagekitOrigins} https://lh3.googleusercontent.com https://i.ytimg.com`,
  "font-src 'self' data:",
  `media-src 'self' blob: ${imagekitOrigins}`,
  // Browser-direct uploads to ImageKit and YouTube (resumable sessions).
  "connect-src 'self' https://upload.imagekit.io https://www.googleapis.com",
  `frame-src ${youtubeFrames}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // SMTP client; keep it out of the webpack server bundle.
  serverExternalPackages: ["nodemailer"],
  // Certificate/receipt PDFs and the generated share image read fonts from disk at request time.
  outputFileTracingIncludes: {
    "/api/student/certificates/**": ["./assets/certificate-fonts/*"],
    "/api/student/payments/**": ["./assets/certificate-fonts/*"],
    "/opengraph-image*": ["./assets/certificate-fonts/sora-latin-600-normal.woff"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ik.imagekit.io" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Older dev uploads were saved as absolute URLs on the app's own origin.
      {
        protocol: "http",
        hostname: "localhost",
        port: "3005",
        pathname: "/uploads/**",
      },
    ],
    // Relative `/uploads/...` and `/images/...` srcs need no config: without
    // `localPatterns`, every local path may be optimized. The optimizer refuses
    // hosts that resolve to private IPs (like localhost) unless this is set, so
    // only the dev server gets it.
    dangerouslyAllowLocalIP: isDev,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // API responses (JSON, inline certificate PDFs) and raw uploads aren't
        // HTML documents; a document CSP there only risks blocking the PDF viewer.
        source: "/((?!api/|uploads/).*)",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }],
      },
    ];
  },
};

export default nextConfig;
