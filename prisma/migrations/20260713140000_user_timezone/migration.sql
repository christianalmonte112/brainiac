-- AlterTable
-- Nullable, additive-only column — no data migration needed, no existing
-- rows affected, no constraints changed. Safe to roll back by simply
-- dropping the column if ever needed: ALTER TABLE "User" DROP COLUMN "timezone";
ALTER TABLE "User" ADD COLUMN "timezone" TEXT;
