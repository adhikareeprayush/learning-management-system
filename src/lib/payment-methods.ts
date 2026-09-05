import type { PaymentMethodType } from "@prisma/client";
import { prisma } from "@/lib/db";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  ESEWA: "eSewa",
  MOBILE_BANKING: "Mobile Banking",
  KHALTI_QR: "Khalti QR",
};

export async function listEnabledPaymentMethods(organizationId: string) {
  return prisma.paymentMethod.findMany({
    where: { organizationId, enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function listAllPaymentMethods(organizationId: string) {
  return prisma.paymentMethod.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getPaymentMethodById(id: string, organizationId?: string) {
  return prisma.paymentMethod.findFirst({
    where: organizationId ? { id, organizationId } : { id },
  });
}

export function isPaymentMethodType(value: string): value is PaymentMethodType {
  return value === "ESEWA" || value === "MOBILE_BANKING" || value === "KHALTI_QR";
}
