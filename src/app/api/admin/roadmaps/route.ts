import { jsonError, requireOrgAdminApi } from "@/lib/api";
import {
  createRoadmap,
  listAdminRoadmaps,
  parseRoadmapInput,
} from "@/lib/roadmap-admin";

export async function GET() {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const roadmaps = await listAdminRoadmaps(auth.organizationId);
  return Response.json({ roadmaps });
}

export async function POST(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => undefined);
  if (body === undefined) return jsonError("Request body must be valid JSON", 400);

  const parsed = parseRoadmapInput(body, "create");
  if (!parsed.ok) return jsonError(parsed.error, 400);

  try {
    const result = await createRoadmap(auth.organizationId, parsed.input);
    if (!result.ok) return jsonError(result.error, result.status);
    return Response.json({ roadmap: result.roadmap }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/roadmaps", error);
    return jsonError("Could not create roadmap", 500);
  }
}
