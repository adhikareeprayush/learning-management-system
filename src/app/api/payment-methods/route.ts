import { listEnabledPaymentMethods } from "@/lib/payment-methods";

export async function GET() {
  const methods = await listEnabledPaymentMethods();
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
