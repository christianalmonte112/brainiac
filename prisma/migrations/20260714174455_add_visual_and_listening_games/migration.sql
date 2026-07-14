-- CreateEnum
CREATE TYPE "VisualGameType" AS ENUM ('MATCHING', 'SEQUENCING');

-- CreateTable
CREATE TABLE "VisualGame" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gameType" "VisualGameType" NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualGameItem" (
    "id" TEXT NOT NULL,
    "visualGameId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "type" "VisualGameType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "itemData" JSONB NOT NULL,
    "correctAnswer" JSONB NOT NULL,

    CONSTRAINT "VisualGameItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualGameAttempt" (
    "id" TEXT NOT NULL,
    "visualGameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualGameAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningSegment" (
    "id" TEXT NOT NULL,
    "listeningGameId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "lyricText" TEXT NOT NULL,
    "vocabularyAnnotations" JSONB NOT NULL,
    "blankedText" TEXT NOT NULL,
    "questions" JSONB NOT NULL,

    CONSTRAINT "ListeningSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningAttempt" (
    "id" TEXT NOT NULL,
    "listeningGameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisualGame_sessionId_gameType_idx" ON "VisualGame"("sessionId", "gameType");

-- CreateIndex
CREATE INDEX "VisualGameItem_visualGameId_orderIndex_idx" ON "VisualGameItem"("visualGameId", "orderIndex");

-- CreateIndex
CREATE INDEX "VisualGameAttempt_userId_createdAt_idx" ON "VisualGameAttempt"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "VisualGameAttempt_visualGameId_userId_idx" ON "VisualGameAttempt"("visualGameId", "userId");

-- CreateIndex
CREATE INDEX "ListeningGame_userId_createdAt_idx" ON "ListeningGame"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ListeningSegment_listeningGameId_orderIndex_idx" ON "ListeningSegment"("listeningGameId", "orderIndex");

-- CreateIndex
CREATE INDEX "ListeningAttempt_userId_createdAt_idx" ON "ListeningAttempt"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ListeningAttempt_listeningGameId_userId_idx" ON "ListeningAttempt"("listeningGameId", "userId");

-- AddForeignKey
ALTER TABLE "VisualGame" ADD CONSTRAINT "VisualGame_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReadingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualGameItem" ADD CONSTRAINT "VisualGameItem_visualGameId_fkey" FOREIGN KEY ("visualGameId") REFERENCES "VisualGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualGameAttempt" ADD CONSTRAINT "VisualGameAttempt_visualGameId_fkey" FOREIGN KEY ("visualGameId") REFERENCES "VisualGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualGameAttempt" ADD CONSTRAINT "VisualGameAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningGame" ADD CONSTRAINT "ListeningGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningSegment" ADD CONSTRAINT "ListeningSegment_listeningGameId_fkey" FOREIGN KEY ("listeningGameId") REFERENCES "ListeningGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningAttempt" ADD CONSTRAINT "ListeningAttempt_listeningGameId_fkey" FOREIGN KEY ("listeningGameId") REFERENCES "ListeningGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningAttempt" ADD CONSTRAINT "ListeningAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
