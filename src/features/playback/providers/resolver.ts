import "server-only";
import { officialEmbedAllowed } from "./official-sources.server";
import { providers, providerAllowsURL } from "./registry";
import { getPrisma } from "@/lib/db/prisma";
import { demoSources } from "@/lib/playback/resolver";
import { validTarget } from "@/lib/playback/validation";
import { progressKey, sourceIdentity } from "@/features/history/types";
import type { PlaybackTarget } from "@/types/playback";
import type { PlaybackResolution, PlaybackOption } from "./types";
import { approvedPolicy, resolvedOptions } from "./policy";
export function legacyOptions(target: PlaybackTarget): PlaybackOption[] {
  return demoSources().filter(source => { const provider = providers.get(source.sourceType === "hls" ? "local-hls" : "local-mp4"); return !!provider?.enabled && providerAllowsURL(provider, source.sourceUrl); }).filter(source => source.mediaId === target.mediaId && source.season === target.season && source.episode === target.episode).map(source => ({ id: source.id, provider: source.sourceType === "hls" ? "BryxTV HLS" : "BryxTV MP4", label: source.title, type: source.sourceType === "hls" ? "VIDEOJS_HLS" : "VIDEOJS_MP4", sourceUrl: source.sourceUrl, progressTracking: "videojs", fullscreen: true, video: source }));
}
export async function resolveSources(target: PlaybackTarget): Promise<PlaybackResolution> {
  if (!validTarget(target)) throw new Error("Invalid playback target.");
  const identity = sourceIdentity(target);
  if (!identity) throw new Error("Invalid playback target.");
  if (identity.mediaType === "demo") return { sources: legacyOptions(target), pending: false, unavailable: false, failed: false };
  try {
    const rows = await getPrisma().playbackSource.findMany({ where: { contentKey: progressKey(identity) }, include: { provider: true } });
    return { sources: resolvedOptions(rows.filter(row => row.provider.slug !== "youtube-privacy" || officialEmbedAllowed(row.sourceUrl,row.mediaType,row.tmdbId,row.seasonNumber ?? undefined,row.episodeNumber ?? undefined)), target), pending: rows.some(row => !!approvedPolicy(row) && row.availabilityStatus === "UNKNOWN"), unavailable: rows.some(row => !!approvedPolicy(row) && row.availabilityStatus === "UNAVAILABLE"), failed: false };
  } catch { return { sources: [], pending: false, unavailable: false, failed: true }; }
}
/** One batch for a season/title; avoids a query per episode. */
export async function titleAvailability(mediaType: "movie" | "tv", tmdbId: number) {
  try {
    const rows = await getPrisma().playbackSource.findMany({ where: { mediaType, tmdbId }, include: { provider: true } });
    const sources = rows.filter(row => row.provider.slug !== "youtube-privacy" || officialEmbedAllowed(row.sourceUrl,row.mediaType,row.tmdbId,row.seasonNumber ?? undefined,row.episodeNumber ?? undefined)).filter(row => resolvedOptions([row], { mediaId: `tmdb:${mediaType}:${tmdbId}`, ...(mediaType === "tv" ? { season: row.seasonNumber!, episode: row.episodeNumber! } : {}) }).length > 0).sort((a,b) => (a.seasonNumber ?? 0)-(b.seasonNumber ?? 0) || (a.episodeNumber ?? 0)-(b.episodeNumber ?? 0) || a.priority-b.priority || a.id.localeCompare(b.id));
    return { sources, pendingKeys: rows.filter(row => approvedPolicy(row) && row.availabilityStatus === "UNKNOWN").map(row => row.contentKey), failed: false };
  } catch { return { sources: [], pendingKeys: [], failed: true }; }
}

export async function resumableKeys(contentKeys: string[]) {
  if (!contentKeys.length) return [];
  const rows = await getPrisma().playbackSource.findMany({ where: { contentKey: { in: contentKeys } }, include: { provider: true } });
  return rows.filter(row => resolvedOptions([row], { mediaId: `tmdb:${row.mediaType}:${row.tmdbId}`, ...(row.mediaType === "tv" ? { season: row.seasonNumber!, episode: row.episodeNumber! } : {}) }).some(source => source.progressTracking === "videojs")).map(row => row.contentKey);
}

