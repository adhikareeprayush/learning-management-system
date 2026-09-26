-- CreateEnum
CREATE TYPE "NewsletterDeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "NewsletterCampaignStatus" ADD VALUE 'SENDING';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_courseId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_instructorId_fkey";

-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_courseId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_userId_fkey";

-- DropIndex
DROP INDEX "assignments_courseId_idx";

-- DropIndex
DROP INDEX "certificates_studentId_idx";

-- DropIndex
DROP INDEX "courses_organizationId_idx";

-- DropIndex
DROP INDEX "enrollments_courseId_idx";

-- DropIndex
DROP INDEX "lesson_progress_studentId_idx";

-- DropIndex
DROP INDEX "payments_status_idx";

-- DropIndex
DROP INDEX "reviews_courseId_idx";

-- DropIndex
DROP INDEX "roadmap_certificates_studentId_idx";

-- DropIndex
DROP INDEX "roadmaps_organizationId_idx";

-- DropIndex
DROP INDEX "roadmaps_status_idx";

-- DropIndex
DROP INDEX "submissions_assignmentId_idx";

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "courseTitle" TEXT,
ADD COLUMN     "holderName" TEXT,
ADD COLUMN     "instructorName" TEXT;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "newsletter_campaigns" ADD COLUMN     "failedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "roadmap_certificates" ADD COLUMN     "courseCount" INTEGER,
ADD COLUMN     "holderName" TEXT,
ADD COLUMN     "roadmapTitle" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "disabledReason" TEXT;

-- AlterTable
ALTER TABLE "verifications" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_deliveries" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT,
    "email" TEXT NOT NULL,
    "status" "NewsletterDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "claimedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_key_key" ON "rate_limits"("key");

-- CreateIndex
CREATE INDEX "newsletter_deliveries_campaignId_status_idx" ON "newsletter_deliveries"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_deliveries_campaignId_email_key" ON "newsletter_deliveries"("campaignId", "email");

-- CreateIndex
CREATE INDEX "contact_messages_organizationId_createdAt_idx" ON "contact_messages"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_ipHash_createdAt_idx" ON "contact_messages"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_email_createdAt_idx" ON "contact_messages"("email", "createdAt");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "assignments_courseId_dueDate_idx" ON "assignments"("courseId", "dueDate");

-- CreateIndex
CREATE INDEX "certificates_courseId_idx" ON "certificates"("courseId");

-- CreateIndex
CREATE INDEX "courses_organizationId_status_idx" ON "courses"("organizationId", "status");

-- CreateIndex
CREATE INDEX "enrollments_studentId_enrolledAt_idx" ON "enrollments"("studentId", "enrolledAt");

-- CreateIndex
CREATE INDEX "lesson_progress_lessonId_idx" ON "lesson_progress"("lessonId");

-- CreateIndex
CREATE INDEX "lesson_progress_studentId_completed_completedAt_idx" ON "lesson_progress"("studentId", "completed", "completedAt");

-- CreateIndex
CREATE INDEX "payments_courseId_status_idx" ON "payments"("courseId", "status");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_courseId_createdAt_idx" ON "reviews"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "roadmap_certificates_roadmapId_idx" ON "roadmap_certificates"("roadmapId");

-- CreateIndex
CREATE INDEX "roadmaps_organizationId_status_idx" ON "roadmaps"("organizationId", "status");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "submissions_studentId_idx" ON "submissions"("studentId");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "newsletter_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_deliveries" ADD CONSTRAINT "newsletter_deliveries_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "newsletter_subscribers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Data backfills ────────────────────────────────────────────────

-- Snapshot issued credentials so later renames don't change them.
UPDATE "certificates" c
SET "holderName" = u."name", "courseTitle" = co."title", "instructorName" = i."name"
FROM "users" u, "courses" co, "users" i
WHERE u."id" = c."studentId" AND co."id" = c."courseId" AND i."id" = co."instructorId";

UPDATE "roadmap_certificates" rc
SET "holderName" = u."name",
    "roadmapTitle" = r."title",
    "courseCount" = (
      SELECT count(*)::int FROM "roadmap_courses" rcs
      JOIN "courses" co ON co."id" = rcs."courseId"
      WHERE rcs."roadmapId" = r."id" AND co."status" = 'PUBLISHED'
    )
FROM "users" u, "roadmaps" r
WHERE u."id" = rc."studentId" AND r."id" = rc."roadmapId";

-- One design category.
UPDATE "courses" SET "category" = 'Design' WHERE "category" = 'Graphic Design';

-- Courses priced only in USD cents: store the NPR amount students were
-- already charged (same conversion as the old pricing fallback).
UPDATE "courses" SET "priceNpr" = GREATEST(1000, ROUND("price" * 135))
WHERE "priceNpr" < 1000 AND "price" > 0;

-- ─── Row-level security ────────────────────────────────────────────
-- Supabase exposes the public schema through its Data API. With RLS on and
-- no policies, anon/authenticated roles see nothing; Prisma connects as the
-- table owner and is unaffected.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables
           WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
