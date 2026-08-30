-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('ESEWA', 'MOBILE_BANKING', 'KHALTI_QR');

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "label" TEXT NOT NULL,
    "accountInfo" TEXT NOT NULL,
    "instructions" TEXT,
    "qrImageUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "payments" DROP COLUMN IF EXISTS "pidx";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "khaltiStatus";

ALTER TABLE "payments" ADD COLUMN "paymentMethodId" TEXT;
ALTER TABLE "payments" ADD COLUMN "methodType" "PaymentMethodType";
ALTER TABLE "payments" ADD COLUMN "screenshotUrl" TEXT;
ALTER TABLE "payments" ADD COLUMN "referenceNote" TEXT;
ALTER TABLE "payments" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "payments" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "payments" ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- DropIndex
DROP INDEX IF EXISTS "payments_pidx_key";
DROP INDEX IF EXISTS "payments_pidx_idx";

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
