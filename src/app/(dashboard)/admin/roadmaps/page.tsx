import { requireAdminPage } from "@/lib/page-guards";
import { listAdminRoadmaps } from "@/lib/roadmap-admin";
import { requireTenantContext } from "@/lib/tenant";
import AdminRoadmapsClient from "./roadmaps-client";

type Props = { searchParams: Promise<{ deleted?: string }> };

export default async function AdminRoadmapsPage({ searchParams }: Props) {
  await requireAdminPage();
  const ctx = await requireTenantContext();
  const [{ deleted }, roadmaps] = await Promise.all([
    searchParams,
    listAdminRoadmaps(ctx.organizationId),
  ]);

  return (
    <AdminRoadmapsClient
      initialRoadmaps={roadmaps}
      initialFlash={deleted ? "Roadmap deleted." : null}
    />
  );
}
