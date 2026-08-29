-- CreateTable
CREATE TABLE "resource_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_attempts_studentId_idx" ON "resource_attempts"("studentId");

-- CreateIndex
CREATE INDEX "resource_attempts_resourceId_idx" ON "resource_attempts"("resourceId");

-- AddForeignKey
ALTER TABLE "resource_attempts" ADD CONSTRAINT "resource_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_attempts" ADD CONSTRAINT "resource_attempts_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "lesson_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
