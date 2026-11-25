CREATE TABLE "WrittenCheck" (
 "id" TEXT NOT NULL,
 "sessionId" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "answers" JSONB NOT NULL,
 "result" JSONB,
 "status" TEXT NOT NULL DEFAULT 'SAVED',
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WrittenCheck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WrittenCheck_sessionId_key" ON "WrittenCheck"("sessionId");
