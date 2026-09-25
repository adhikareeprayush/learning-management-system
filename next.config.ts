import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Certificate PDFs read their embedded fonts from disk at request time.
  outputFileTracingIncludes: {
    "/api/student/certificates/**": ["./assets/certificate-fonts/*"],
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
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
