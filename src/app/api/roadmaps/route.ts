import { jsonError, requireSession } from "@/lib/api";
import { listPublishedRoadmaps } from "@/lib/roadmaps";

export async function GET() {
  const session = await requireSession();
  const roadmaps = await listPublishedRoadmaps(session?.user.id ?? null);
  return Response.json({ roadmaps });
}
