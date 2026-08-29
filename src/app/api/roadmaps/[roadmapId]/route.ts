import { jsonError, requireSession } from "@/lib/api";
import { getRoadmapDetail } from "@/lib/roadmaps";

type Params = { params: Promise<{ roadmapId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { roadmapId } = await params;
  const session = await requireSession();
  const roadmap = await getRoadmapDetail(roadmapId, session?.user.id ?? null);
  if (!roadmap) return jsonError("Roadmap not found", 404);
  return Response.json(roadmap);
}
