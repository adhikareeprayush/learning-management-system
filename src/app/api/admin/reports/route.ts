import {
  getAdminReportsData,
  type ReportPeriodKey,
} from "@/lib/dashboard-data";
import { jsonError, requireSession } from "@/lib/api";

const periods: ReportPeriodKey[] = ["7d", "30d", "6m"];

function isPeriod(value: string | null): value is ReportPeriodKey {
  return periods.includes(value as ReportPeriodKey);
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const periodParam = new URL(request.url).searchParams.get("period");
  const period: ReportPeriodKey = isPeriod(periodParam) ? periodParam : "30d";

  const data = await getAdminReportsData(period);

  return Response.json({
    data,
    period,
    refreshedAt: new Date().toISOString(),
  });
}
