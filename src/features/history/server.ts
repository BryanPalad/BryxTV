import "server-only";
import { resolveSources, legacyOptions } from "@/features/playback/providers/resolver";
import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/db/prisma";
import { getMovieDetails, getTVDetails } from "@/lib/providers/tmdb/service";
import { progressKey, type ProgressIdentity, type HistoryItem, type parseProgressInput } from "./types";
import type { ViewingProgress } from "@/generated/prisma/client";
export function progressSource(target: ProgressIdentity) {
  return legacyOptions(target.mediaType === "demo" ? { mediaId: `demo:${target.demoId}` } : { mediaId: `tmdb:${target.mediaType}:${target.tmdbId}`, ...(target.mediaType === "tv" ? { season: target.seasonNumber, episode: target.episodeNumber } : {}) })[0]?.video ?? null;
}
export function allowedIdentity(target: ProgressIdentity) {
  return target.mediaType !== "demo" || !!progressSource(target);
}
export function getProgress(userId: string, target: ProgressIdentity) {
  return getPrisma().viewingProgress.findUnique({ where: { userId_contentKey: { userId, contentKey: progressKey(target) } } });
}
export async function putProgress(userId: string, sample: ReturnType<typeof parseProgressInput>) {
  const key = progressKey(sample), db = getPrisma();
  const movieId = sample.mediaType === "demo" ? null : sample.tmdbId;
  const demoId = sample.mediaType === "demo" ? sample.demoId : null;
  const season = sample.mediaType === "tv" ? sample.seasonNumber : null;
  const episode = sample.mediaType === "tv" ? sample.episodeNumber : null;
  await db.$executeRaw`
    INSERT INTO "viewing_progress" ("id","userId","contentKey","mediaType","tmdbId","demoId","seasonNumber","episodeNumber","positionSeconds","durationSeconds","completed","observedAt","lastWatchedAt","createdAt","updatedAt")
    VALUES (${randomUUID()},${userId},${key},CAST(${sample.mediaType} AS "ViewingMediaType"),${movieId}::integer,${demoId},${season}::integer,${episode}::integer,${sample.positionSeconds},${sample.durationSeconds},${sample.completed},${new Date(sample.observedAt)},NOW(),NOW(),NOW())
    ON CONFLICT ("userId","contentKey") DO UPDATE SET
      "positionSeconds"=EXCLUDED."positionSeconds", "durationSeconds"=EXCLUDED."durationSeconds", "completed"=EXCLUDED."completed", "observedAt"=EXCLUDED."observedAt", "lastWatchedAt"=NOW(), "updatedAt"=NOW()
    WHERE "viewing_progress"."observedAt" < EXCLUDED."observedAt"
  `;
  return getProgress(userId, sample);
}
export async function deleteProgress(userId: string, target: ProgressIdentity) {
  await getPrisma().viewingProgress.deleteMany({ where: { userId, contentKey: progressKey(target) } });
}
export interface HistoryQuery { page: number; type?: "movie" | "tv" | "demo"; continuing: boolean }
export async function historyPage(userId: string, query: HistoryQuery) {
  const db = getPrisma();
  // Retain unfinished history even when delivery is withdrawn; presentation rechecks eligibility.
  const where = { userId, ...(query.type ? { mediaType: query.type } : {}), ...(query.continuing ? { completed: false, positionSeconds: { gt: 0 } } : {}) };
  const size = query.continuing ? 12 : 24;
  const total = await db.viewingProgress.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / size)), page = Math.min(query.page, totalPages);
  const rows = await db.viewingProgress.findMany({ where, orderBy: [{ lastWatchedAt: "desc" }, { id: "desc" }], skip: (page - 1) * size, take: size });
  const items: HistoryItem[] = new Array(rows.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, rows.length) }, async () => {
    while (next < rows.length) { const index = next++; items[index] = await presentProgress(rows[index]!); }
  }));
  return { items, page, totalPages, total };
}
export function publicProgress(row: ViewingProgress | null) {
  if (!row) return null;
  const { userId: _userId, id: _id, observedAt: _observedAt, createdAt: _createdAt, updatedAt: _updatedAt, ...publicRow } = row;
  void _userId; void _id; void _observedAt; void _createdAt; void _updatedAt;
  return publicRow;
}
export async function presentProgress(row: ViewingProgress): Promise<HistoryItem> {
  const target: ProgressIdentity = row.mediaType === "demo" ? { mediaType: "demo", demoId: row.demoId! } : row.mediaType === "movie" ? { mediaType: "movie", tmdbId: row.tmdbId! } : { mediaType: "tv", tmdbId: row.tmdbId!, seasonNumber: row.seasonNumber!, episodeNumber: row.episodeNumber! };
  const legacy = progressSource(target);
  const resolution = target.mediaType === "demo" ? null : await resolveSources({ mediaId: `tmdb:${target.mediaType}:${target.tmdbId}`, ...(target.mediaType === "tv" ? { season: target.seasonNumber, episode: target.episodeNumber } : {}) });
  const resumable = resolution?.sources.find(option => option.progressTracking === "videojs");
  const source = legacy ?? resumable?.video ?? null;
  let title = source?.title ?? `${row.mediaType === "tv" ? "TV series" : "Movie"} #${row.tmdbId}`, posterUrl: string | null = source?.posterUrl ?? null;
  if (target.mediaType !== "demo") {
    try { const metadata = await (target.mediaType === "movie" ? getMovieDetails(target.tmdbId) : getTVDetails(target.tmdbId)); title = metadata.title; posterUrl = metadata.posterUrl; } catch { /* Keep the history record even if TMDB fails. */ }
  }
  const watchHref = source ? target.mediaType === "demo" ? `/watch/demo/${target.demoId}` : target.mediaType === "movie" ? `/watch/movie/${target.tmdbId}` : `/watch/tv/${target.tmdbId}?season=${target.seasonNumber}&episode=${target.episodeNumber}` : null;
  const resumeHref = watchHref && resumable ? `${watchHref}${watchHref.includes("?") ? "&" : "?"}source=${encodeURIComponent(resumable.id)}` : watchHref;
  return { ...publicProgress(row)!, playbackAvailable: !!legacy || !!resolution?.sources.length, lastWatchedAt: row.lastWatchedAt.toISOString(), title, posterUrl, watchHref: resumeHref, detailsHref: target.mediaType === "demo" ? `/watch/demo/${target.demoId}` : `/${target.mediaType}/${target.tmdbId}` };
}
