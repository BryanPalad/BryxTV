-- CreateEnum
CREATE TYPE "ViewingMediaType" AS ENUM ('movie', 'tv', 'demo');

-- CreateTable
CREATE TABLE "viewing_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentKey" TEXT NOT NULL,
    "mediaType" "ViewingMediaType" NOT NULL,
    "tmdbId" INTEGER,
    "demoId" TEXT,
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "positionSeconds" DOUBLE PRECISION NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viewing_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "viewing_progress_userId_lastWatchedAt_id_idx" ON "viewing_progress"("userId", "lastWatchedAt", "id");

-- CreateIndex
CREATE INDEX "viewing_progress_userId_completed_lastWatchedAt_idx" ON "viewing_progress"("userId", "completed", "lastWatchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "viewing_progress_userId_contentKey_key" ON "viewing_progress"("userId", "contentKey");

-- AddForeignKey
ALTER TABLE "viewing_progress" ADD CONSTRAINT "viewing_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Canonical non-null keys avoid PostgreSQL's nullable compound uniqueness trap.
ALTER TABLE "viewing_progress" ADD CONSTRAINT "viewing_progress_identity_check" CHECK (
  ("mediaType" = 'movie' AND "tmdbId" IS NOT NULL AND "tmdbId" > 0 AND "demoId" IS NULL AND "seasonNumber" IS NULL AND "episodeNumber" IS NULL AND "contentKey" = 'movie:' || "tmdbId"::text)
  OR ("mediaType" = 'tv' AND "tmdbId" IS NOT NULL AND "tmdbId" > 0 AND "demoId" IS NULL AND "seasonNumber" IS NOT NULL AND "seasonNumber" BETWEEN 0 AND 9999 AND "episodeNumber" IS NOT NULL AND "episodeNumber" BETWEEN 1 AND 9999 AND "contentKey" = 'tv:' || "tmdbId"::text || ':' || "seasonNumber"::text || ':' || "episodeNumber"::text)
  OR ("mediaType" = 'demo' AND "tmdbId" IS NULL AND "demoId" IS NOT NULL AND "demoId" ~ '^[a-z0-9-]+$' AND "seasonNumber" IS NULL AND "episodeNumber" IS NULL AND "contentKey" = 'demo:' || "demoId")
);
ALTER TABLE "viewing_progress" ADD CONSTRAINT "viewing_progress_seconds_check" CHECK (
  "positionSeconds" >= 0 AND "positionSeconds" <= "durationSeconds" AND "durationSeconds" > 0 AND "durationSeconds" <= 2592000
);
