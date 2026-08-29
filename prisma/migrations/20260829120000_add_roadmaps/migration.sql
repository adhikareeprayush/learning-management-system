-- CreateEnum
CREATE TYPE "RoadmapStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "category" TEXT,
    "level" "Level" NOT NULL DEFAULT 'BEGINNER',
    "status" "RoadmapStatus" NOT NULL DEFAULT 'DRAFT',
    "outcomes" TEXT[],
    "estimatedHours" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_courses" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roadmap_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_enrollments" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_certificates" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roadmaps_slug_key" ON "roadmaps"("slug");

-- CreateIndex
CREATE INDEX "roadmaps_status_idx" ON "roadmaps"("status");

-- CreateIndex
CREATE INDEX "roadmap_courses_courseId_idx" ON "roadmap_courses"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_courses_roadmapId_courseId_key" ON "roadmap_courses"("roadmapId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_courses_roadmapId_order_key" ON "roadmap_courses"("roadmapId", "order");

-- CreateIndex
CREATE INDEX "roadmap_enrollments_studentId_idx" ON "roadmap_enrollments"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_enrollments_roadmapId_studentId_key" ON "roadmap_enrollments"("roadmapId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_certificates_credentialId_key" ON "roadmap_certificates"("credentialId");

-- CreateIndex
CREATE INDEX "roadmap_certificates_studentId_idx" ON "roadmap_certificates"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_certificates_studentId_roadmapId_key" ON "roadmap_certificates"("studentId", "roadmapId");

-- AddForeignKey
ALTER TABLE "roadmap_courses" ADD CONSTRAINT "roadmap_courses_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_courses" ADD CONSTRAINT "roadmap_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_enrollments" ADD CONSTRAINT "roadmap_enrollments_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_enrollments" ADD CONSTRAINT "roadmap_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_certificates" ADD CONSTRAINT "roadmap_certificates_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_certificates" ADD CONSTRAINT "roadmap_certificates_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
