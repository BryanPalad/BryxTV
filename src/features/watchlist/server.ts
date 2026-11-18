import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import type { WatchlistTitle } from "./types";
export function listWatchlist(userId: string) {
  return getPrisma().watchlistItem.findMany({
    where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { tmdbId: true, mediaType: true },
  });
}
export async function addWatchlist(userId: string, item: WatchlistTitle) {
  // PostgreSQL ON CONFLICT avoids the read/create race of an empty-update upsert.
  await getPrisma().watchlistItem.createMany({
    data: [{ userId, ...item }], skipDuplicates: true,
  });
}
export async function removeWatchlist(userId: string, item: WatchlistTitle) {
  await getPrisma().watchlistItem.deleteMany({ where: { userId, ...item } });
}

export async function isWatchlisted(userId: string, item: WatchlistTitle) {
  return !!await getPrisma().watchlistItem.findUnique({
    where: { userId_tmdbId_mediaType: { userId, ...item } }, select: { id: true },
  });
}
