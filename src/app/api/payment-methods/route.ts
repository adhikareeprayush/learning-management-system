import { listEnabledPaymentMethods } from "@/lib/payment-methods";
import { requireTenantApi } from "@/lib/api";

export async function GET() {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const methods = await listEnabledPaymentMethods(tenant.organizationId);
  return Response.json({
    methods: methods.map((method) => ({
      id: method.id,
      type: method.type,
      label: method.label,
      accountInfo: method.accountInfo,
      instructions: method.instructions,
      qrImageUrl: method.qrImageUrl,
    })),
  });
}
