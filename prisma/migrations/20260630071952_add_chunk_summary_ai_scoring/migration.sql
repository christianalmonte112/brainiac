-- AlterTable
ALTER TABLE "ChunkSummary" ADD COLUMN     "aiFeedback" TEXT,
ADD COLUMN     "aiScore" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'en';
