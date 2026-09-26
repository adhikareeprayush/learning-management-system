import type { Metadata } from "next";
import { RoadmapForm } from "@/components/admin/roadmap-form";
import { requireAdminPage } from "@/lib/page-guards";
import { listRoadmapCourseOptions } from "@/lib/roadmap-admin";
import { requireTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "New roadmap" };

export default async function NewRoadmapPage() {
  await requireAdminPage();
  const ctx = await requireTenantContext();
  const courseOptions = await listRoadmapCourseOptions(ctx.organizationId);

  return <RoadmapForm roadmap={null} courseOptions={courseOptions} />;
}
