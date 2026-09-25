import { notFound } from "next/navigation";
import { RoadmapForm } from "@/components/admin/roadmap-form";
import { requireAdminPage } from "@/lib/page-guards";
import {
  getAdminRoadmap,
  listRoadmapCourseOptions,
} from "@/lib/roadmap-admin";
import { requireTenantContext } from "@/lib/tenant";

type Props = {
  params: Promise<{ roadmapId: string }>;
  searchParams: Promise<{ created?: string }>;
};

const createdMessages: Record<string, string> = {
  draft: "Roadmap created as a draft.",
  published: "Roadmap created and published.",
};

export default async function EditRoadmapPage({ params, searchParams }: Props) {
  await requireAdminPage();
  const ctx = await requireTenantContext();
  const [{ roadmapId }, { created }] = await Promise.all([params, searchParams]);

  const [roadmap, courseOptions] = await Promise.all([
    getAdminRoadmap(ctx.organizationId, roadmapId),
    listRoadmapCourseOptions(ctx.organizationId),
  ]);
  if (!roadmap) notFound();

  return (
    <RoadmapForm
      key={roadmap.id}
      roadmap={roadmap}
      courseOptions={courseOptions}
      initialFlash={(created && createdMessages[created]) || null}
    />
  );
}
