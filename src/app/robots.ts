import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Rules are prefix matches, so the dashboards are listed with a trailing
      // slash plus an exact match to keep /instructors and /students crawlable.
      disallow: [
        "/admin",
        "/instructor/",
        "/instructor$",
        "/student/",
        "/student$",
        "/api/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify/",
        "/unsubscribe",
        "/email-verified",
      ],
    },
    sitemap: appUrl("/sitemap.xml"),
  };
}
