-- Multi-tenant SaaS conversion

-- New enums
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN');
CREATE TYPE "OrgRole" AS ENUM ('ORG_ADMIN', 'INSTRUCTOR', 'STUDENT');
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- Plans
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceNpr" INTEGER NOT NULL DEFAULT 0,
    "billingPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "limits" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL DEFAULT '{}',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- Organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "organizations_subdomain_key" ON "organizations"("subdomain");
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Organization members
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");
CREATE INDEX "organization_members_userId_idx" ON "organization_members"("userId");
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Subscriptions
CREATE TABLE "organization_subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organization_subscriptions_organizationId_key" ON "organization_subscriptions"("organizationId");
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Subscription payments
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "screenshotUrl" TEXT,
    "referenceNote" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscription_payments_purchaseOrderId_key" ON "subscription_payments"("purchaseOrderId");
CREATE INDEX "subscription_payments_subscriptionId_idx" ON "subscription_payments"("subscriptionId");
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments"("status");
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "organization_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Platform payment methods
CREATE TABLE "platform_payment_methods" (
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
    CONSTRAINT "platform_payment_methods_pkey" PRIMARY KEY ("id")
);

-- User platform role
ALTER TABLE "users" ADD COLUMN "platformRole" "PlatformRole";

-- Add organizationId columns (nullable for backfill)
ALTER TABLE "courses" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "roadmaps" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "payment_methods" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "newsletter_subscribers" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "newsletter_campaigns" ADD COLUMN "organizationId" TEXT;

-- Seed default org and plans (using fixed cuid-like ids for backfill)
INSERT INTO "plans" ("id", "slug", "name", "description", "priceNpr", "billingPeriod", "limits", "features", "isPublic", "sortOrder", "updatedAt")
VALUES
  ('plan_free', 'free', 'Free', 'Get started with one course and up to 50 students.', 0, 'monthly',
   '{"maxCourses":1,"maxInstructors":1,"maxStudents":50,"storageMb":500}'::jsonb,
   '{"certificates":true,"roadmaps":false,"analytics":false,"whiteLabel":false}'::jsonb, true, 0, NOW()),
  ('plan_starter', 'starter', 'Starter', 'For growing institutes with multiple courses.', 299900, 'monthly',
   '{"maxCourses":10,"maxInstructors":3,"maxStudents":500,"storageMb":5000}'::jsonb,
   '{"certificates":true,"roadmaps":true,"analytics":true,"whiteLabel":false}'::jsonb, true, 1, NOW()),
  ('plan_pro', 'pro', 'Pro', 'Unlimited courses and advanced features.', 999900, 'monthly',
   '{"maxCourses":-1,"maxInstructors":10,"maxStudents":5000,"storageMb":50000}'::jsonb,
   '{"certificates":true,"roadmaps":true,"analytics":true,"whiteLabel":true}'::jsonb, true, 2, NOW()),
  ('plan_enterprise', 'enterprise', 'Enterprise', 'Custom limits and priority support.', 0, 'monthly',
   '{"maxCourses":-1,"maxInstructors":-1,"maxStudents":-1,"storageMb":-1}'::jsonb,
   '{"certificates":true,"roadmaps":true,"analytics":true,"whiteLabel":true}'::jsonb, false, 3, NOW());

INSERT INTO "organizations" ("id", "name", "slug", "subdomain", "status", "branding", "settings", "planId", "updatedAt")
VALUES ('org_edujarr', 'Edujarr Demo Institute', 'edujarr', 'edujarr', 'ACTIVE', '{}'::jsonb, '{}'::jsonb, 'plan_pro', NOW());

INSERT INTO "organization_subscriptions" ("id", "organizationId", "planId", "status", "currentPeriodStart", "currentPeriodEnd", "updatedAt")
VALUES ('sub_edujarr', 'org_edujarr', 'plan_pro', 'ACTIVE', NOW(), NOW() + INTERVAL '1 year', NOW());

-- Backfill organizationId
UPDATE "courses" SET "organizationId" = 'org_edujarr' WHERE "organizationId" IS NULL;
UPDATE "roadmaps" SET "organizationId" = 'org_edujarr' WHERE "organizationId" IS NULL;
UPDATE "payment_methods" SET "organizationId" = 'org_edujarr' WHERE "organizationId" IS NULL;
UPDATE "newsletter_subscribers" SET "organizationId" = 'org_edujarr' WHERE "organizationId" IS NULL;
UPDATE "newsletter_campaigns" SET "organizationId" = 'org_edujarr' WHERE "organizationId" IS NULL;

-- Migrate admin to super admin + org members from existing users
UPDATE "users" SET "platformRole" = 'SUPER_ADMIN' WHERE "email" = 'admin@edujarr.com';

INSERT INTO "organization_members" ("id", "organizationId", "userId", "role", "updatedAt")
SELECT
  'om_' || u."id",
  'org_edujarr',
  u."id",
  CASE u."role"
    WHEN 'ADMIN' THEN 'ORG_ADMIN'::"OrgRole"
    WHEN 'INSTRUCTOR' THEN 'INSTRUCTOR'::"OrgRole"
    ELSE 'STUDENT'::"OrgRole"
  END,
  NOW()
FROM "users" u
WHERE u."email" != 'admin@edujarr.com' OR u."platformRole" IS NULL
ON CONFLICT DO NOTHING;

-- Also add admin as org admin member
INSERT INTO "organization_members" ("id", "organizationId", "userId", "role", "updatedAt")
SELECT 'om_admin', 'org_edujarr', u."id", 'ORG_ADMIN'::"OrgRole", NOW()
FROM "users" u WHERE u."email" = 'admin@edujarr.com'
ON CONFLICT ("organizationId", "userId") DO UPDATE SET "role" = 'ORG_ADMIN';

-- Make organizationId NOT NULL
ALTER TABLE "courses" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "roadmaps" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "payment_methods" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "newsletter_subscribers" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "newsletter_campaigns" ALTER COLUMN "organizationId" SET NOT NULL;

-- Drop old unique constraints and add scoped ones
DROP INDEX IF EXISTS "courses_slug_key";
CREATE UNIQUE INDEX "courses_organizationId_slug_key" ON "courses"("organizationId", "slug");
CREATE INDEX "courses_organizationId_idx" ON "courses"("organizationId");
ALTER TABLE "courses" ADD CONSTRAINT "courses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "roadmaps_slug_key";
CREATE UNIQUE INDEX "roadmaps_organizationId_slug_key" ON "roadmaps"("organizationId", "slug");
CREATE INDEX "roadmaps_organizationId_idx" ON "roadmaps"("organizationId");
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "payment_methods_organizationId_idx" ON "payment_methods"("organizationId");
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "newsletter_subscribers_email_key";
CREATE UNIQUE INDEX "newsletter_subscribers_organizationId_email_key" ON "newsletter_subscribers"("organizationId", "email");
CREATE INDEX "newsletter_subscribers_organizationId_idx" ON "newsletter_subscribers"("organizationId");
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "newsletter_campaigns_organizationId_idx" ON "newsletter_campaigns"("organizationId");
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Platform payment methods seed
INSERT INTO "platform_payment_methods" ("id", "type", "label", "accountInfo", "instructions", "enabled", "sortOrder", "updatedAt")
VALUES
  ('ppm_esewa', 'ESEWA', 'eSewa', '9800000000', 'Send payment to this eSewa ID and upload screenshot.', true, 0, NOW()),
  ('ppm_mobile', 'MOBILE_BANKING', 'Mobile Banking', 'Nabil Bank — 1234567890', 'Transfer via mobile banking and upload proof.', true, 1, NOW()),
  ('ppm_khalti', 'KHALTI_QR', 'Khalti QR', 'Khalti ID: edujarr', 'Scan QR or send to Khalti ID.', true, 2, NOW());
