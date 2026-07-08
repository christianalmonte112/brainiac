-- CreateTable
CREATE TABLE "HighlightInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "selectedText" TEXT NOT NULL,
    "surroundingContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HighlightInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HighlightInteraction_userId_createdAt_idx" ON "HighlightInteraction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "HighlightInteraction_sessionId_idx" ON "HighlightInteraction"("sessionId");

-- AddForeignKey
ALTER TABLE "HighlightInteraction" ADD CONSTRAINT "HighlightInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HighlightInteraction" ADD CONSTRAINT "HighlightInteraction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReadingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
