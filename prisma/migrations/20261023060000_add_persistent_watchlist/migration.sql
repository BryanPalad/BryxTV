-- CreateEnum
CREATE TYPE "WatchlistMediaType" AS ENUM ('movie', 'tv');

-- CreateTable
CREATE TABLE "watchlist_item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "WatchlistMediaType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlist_item_userId_createdAt_id_idx" ON "watchlist_item"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_item_userId_tmdbId_mediaType_key" ON "watchlist_item"("userId", "tmdbId", "mediaType");

-- AddForeignKey
ALTER TABLE "watchlist_item" ADD CONSTRAINT "watchlist_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
