-- AlterTable
ALTER TABLE "ReadingSession" ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ReadingSession_userId_pinnedAt_idx" ON "ReadingSession"("userId", "pinnedAt" DESC);
