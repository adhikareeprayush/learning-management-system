import { cache } from "react";
import { prisma } from "@/lib/db";

// Kept apart from tenant.ts: that module imports auth, and auth's email hooks
// need the institute record, so importing tenant here would be circular.
export const DEFAULT_ORG_SLUG =
  process.env.DEFAULT_ORG_SLUG?.trim().toLowerCase() || "convolution-labs";

export const getDefaultOrganization = cache(async () => {
  const bySlug = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
  });
  if (bySlug) return bySlug;

  return prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
});
