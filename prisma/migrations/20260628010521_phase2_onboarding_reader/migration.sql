-- AlterTable
ALTER TABLE "ReadingSession" ADD COLUMN     "currentChunkIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "elapsedSeconds" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BaselineAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readingSpeedWPM" INTEGER NOT NULL,
    "comprehensionScore" DOUBLE PRECISION NOT NULL,
    "vocabularyScore" DOUBLE PRECISION NOT NULL,
    "inferenceScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaselineAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "phonetic" TEXT,
    "definition" TEXT NOT NULL,
    "etymology" TEXT,
    "synonyms" TEXT[],
    "sourceSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChunkSummary" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "summaryText" TEXT,
    "keywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChunkSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaselineAssessment_userId_key" ON "BaselineAssessment"("userId");

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_createdAt_idx" ON "VocabularyWord"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyWord_userId_word_key" ON "VocabularyWord"("userId", "word");

-- CreateIndex
CREATE UNIQUE INDEX "ChunkSummary_sessionId_chunkIndex_key" ON "ChunkSummary"("sessionId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "BaselineAssessment" ADD CONSTRAINT "BaselineAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyWord" ADD CONSTRAINT "VocabularyWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyWord" ADD CONSTRAINT "VocabularyWord_sourceSessionId_fkey" FOREIGN KEY ("sourceSessionId") REFERENCES "ReadingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChunkSummary" ADD CONSTRAINT "ChunkSummary_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReadingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
