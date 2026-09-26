import { after } from "next/server";
import { jsonError, requireOrgAdminApi } from "@/lib/api";
import {
  deleteRoadmap,
  getAdminRoadmap,
  parseRoadmapInput,
  syncRoadmapLearners,
  updateRoadmap,
} from "@/lib/roadmap-admin";

type Params = { params: Promise<{ roadmapId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { roadmapId } = await params;
  const roadmap = await getAdminRoadmap(auth.organizationId, roadmapId);
  if (!roadmap) return jsonError("Roadmap not found", 404);
  return Response.json({ roadmap });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => undefined);
  if (body === undefined) return jsonError("Request body must be valid JSON", 400);

  const parsed = parseRoadmapInput(body, "update");
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const { roadmapId } = await params;
  try {
    const result = await updateRoadmap(auth.organizationId, roadmapId, parsed.input);
    if (!result.ok) return jsonError(result.error, result.status);
    if (result.coursesChanged) {
      after(() =>
        syncRoadmapLearners(
          auth.organizationId,
          result.roadmap.id,
          result.addedCourseIds,
        ),
      );
    }
    return Response.json({ roadmap: result.roadmap });
  } catch (error) {
    console.error("PATCH /api/admin/roadmaps/[roadmapId]", error);
    return jsonError("Could not update roadmap", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { roadmapId } = await params;
  try {
    const result = await deleteRoadmap(auth.organizationId, roadmapId);
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/roadmaps/[roadmapId]", error);
    return jsonError("Could not delete roadmap", 500);
  }
}
