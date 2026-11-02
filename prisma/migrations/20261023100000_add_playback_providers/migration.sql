-- CreateEnum
CREATE TYPE "PlaybackSourceType" AS ENUM ('VIDEOJS_MP4', 'VIDEOJS_HLS', 'EXTERNAL_EMBED');

-- CreateEnum
CREATE TYPE "PlaybackAvailability" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "playback_provider" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlaybackSourceType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playback_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playback_source" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "contentKey" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "WatchlistMediaType" NOT NULL,
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "sourceUrl" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "authorizationVerified" BOOLEAN NOT NULL DEFAULT false,
    "authorizationEvidence" TEXT,
    "availabilityStatus" "PlaybackAvailability" NOT NULL DEFAULT 'UNKNOWN',
    "verificationEvidence" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playback_source_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "playback_provider_slug_key" ON "playback_provider"("slug");

-- CreateIndex
CREATE INDEX "playback_source_contentKey_enabled_authorizationVerified_av_idx" ON "playback_source"("contentKey", "enabled", "authorizationVerified", "availabilityStatus", "priority");

-- CreateIndex
CREATE INDEX "playback_source_mediaType_tmdbId_seasonNumber_episodeNumber_idx" ON "playback_source"("mediaType", "tmdbId", "seasonNumber", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "playback_source_providerId_contentKey_sourceUrl_key" ON "playback_source"("providerId", "contentKey", "sourceUrl");

-- AddForeignKey
ALTER TABLE "playback_source" ADD CONSTRAINT "playback_source_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "playback_provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "playback_source" ADD CONSTRAINT "playback_source_identity_check" CHECK (
 ("mediaType"='movie' AND "tmdbId">0 AND "seasonNumber" IS NULL AND "episodeNumber" IS NULL AND "contentKey"='movie:' || "tmdbId"::text)
 OR ("mediaType"='tv' AND "tmdbId">0 AND "seasonNumber" IS NOT NULL AND "seasonNumber" BETWEEN 0 AND 9999 AND "episodeNumber" IS NOT NULL AND "episodeNumber" BETWEEN 1 AND 9999 AND "contentKey"='tv:' || "tmdbId"::text || ':' || "seasonNumber"::text || ':' || "episodeNumber"::text)
);
ALTER TABLE "playback_source" ADD CONSTRAINT "playback_source_verification_check" CHECK (
 (NOT "authorizationVerified" OR length(trim("authorizationEvidence"))>0 AND "authorizationEvidence" IS NOT NULL)
 AND ("availabilityStatus" <> 'AVAILABLE' OR "lastCheckedAt" IS NOT NULL AND "verificationEvidence" IS NOT NULL AND length(trim("verificationEvidence"))>0)
);
