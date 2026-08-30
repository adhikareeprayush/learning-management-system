import type { PaymentMethodType } from "@prisma/client";
import { prisma } from "@/lib/db";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  ESEWA: "eSewa",
  MOBILE_BANKING: "Mobile Banking",
  KHALTI_QR: "Khalti QR",
};

export async function listEnabledPaymentMethods() {
  return prisma.paymentMethod.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function listAllPaymentMethods() {
  return prisma.paymentMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getPaymentMethodById(id: string) {
  return prisma.paymentMethod.findUnique({ where: { id } });
}

export function isPaymentMethodType(value: string): value is PaymentMethodType {
  return value === "ESEWA" || value === "MOBILE_BANKING" || value === "KHALTI_QR";
}
