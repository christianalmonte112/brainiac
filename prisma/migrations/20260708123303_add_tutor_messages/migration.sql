-- CreateEnum
CREATE TYPE "TutorRole" AS ENUM ('USER', 'TUTOR');

-- CreateTable
CREATE TABLE "TutorMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "TutorRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutorMessage_sessionId_createdAt_idx" ON "TutorMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "TutorMessage" ADD CONSTRAINT "TutorMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReadingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
