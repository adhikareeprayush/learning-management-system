import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { getDefaultOrganization } from "@/lib/default-org";

// Prerendered, then refreshed hourly as courses and roadmaps are published.
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

function latest(dates: Date[]) {
  return dates.reduce<Date | undefined>(
    (max, date) => (!max || date > max ? date : max),
    undefined,
  );
}

async function loadPublishedContent() {
  try {
    const org = await getDefaultOrganization();
    if (!org) return { courses: [], roadmaps: [] };
    const where = { organizationId: org.id, status: "PUBLISHED" } as const;
    const select = { slug: true, updatedAt: true } as const;
    const [courses, roadmaps] = await Promise.all([
      prisma.course.findMany({ where, select, orderBy: { updatedAt: "desc" } }),
      prisma.roadmap.findMany({ where, select, orderBy: { updatedAt: "desc" } }),
    ]);
    return { courses, roadmaps };
  } catch (error) {
    // Still serve the static pages when the database is unreachable.
    console.warn(
      "[sitemap] listing static pages only:",
      error instanceof Error ? error.message : error,
    );
    return { courses: [], roadmaps: [] };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { courses, roadmaps } = await loadPublishedContent();
  const coursesUpdated = latest(courses.map((course) => course.updatedAt));
  const roadmapsUpdated = latest(roadmaps.map((roadmap) => roadmap.updatedAt));
  const anyUpdated = latest(
    [coursesUpdated, roadmapsUpdated].filter((date): date is Date => Boolean(date)),
  );

  const pages: Entry[] = [
    { url: appUrl("/"), lastModified: anyUpdated, changeFrequency: "daily", priority: 1 },
    { url: appUrl("/courses"), lastModified: coursesUpdated, changeFrequency: "daily", priority: 0.9 },
    { url: appUrl("/roadmaps"), lastModified: roadmapsUpdated, changeFrequency: "weekly", priority: 0.8 },
    { url: appUrl("/instructors"), changeFrequency: "weekly", priority: 0.6 },
    { url: appUrl("/faq"), changeFrequency: "monthly", priority: 0.5 },
    { url: appUrl("/contact"), changeFrequency: "yearly", priority: 0.4 },
    { url: appUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: appUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...pages,
    ...courses.map(
      (course): Entry => ({
        url: appUrl(`/courses/${course.slug}`),
        lastModified: course.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
    ...roadmaps.map(
      (roadmap): Entry => ({
        url: appUrl(`/roadmaps/${roadmap.slug}`),
        lastModified: roadmap.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
  ];
}
