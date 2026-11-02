import { z } from "zod";
import type { PlaybackTarget } from "@/types/playback";
const id = z.number().int().positive().max(2147483647);
export const progressIdentity = z.discriminatedUnion("mediaType", [
  z.object({ mediaType: z.literal("movie"), tmdbId: id }).strict(),
  z.object({ mediaType: z.literal("tv"), tmdbId: id, seasonNumber: z.number().int().min(0).max(9999), episodeNumber: z.number().int().min(1).max(9999) }).strict(),
  z.object({ mediaType: z.literal("demo"), demoId: z.string().regex(/^[a-z0-9-]{1,100}$/) }).strict(),
]);
export type ProgressIdentity = z.infer<typeof progressIdentity>;
export const COMPLETION_RATIO = 0.95;
const sample = { positionSeconds: z.number().finite().nonnegative(), durationSeconds: z.number().finite().positive().max(2592000), ended: z.boolean().default(false), observedAt: z.number().int().positive().safe() };
// Parse identity and playback fields independently, with no client-provided owner/key.
export function parseProgressInput(value: unknown) {
  const object = z.object(sample).passthrough().parse(value);
  const { positionSeconds, durationSeconds, ended, observedAt, ...identity } = object;
  const target = progressIdentity.parse(identity);
  if (observedAt > Date.now() + 60000) throw new Error("Invalid observation time");
  const position = Math.min(positionSeconds, durationSeconds);
  return { ...target, positionSeconds: position, durationSeconds, completed: ended || position / durationSeconds >= COMPLETION_RATIO, observedAt: Math.min(observedAt, Date.now()) };
}
export type ProgressSample = ProgressIdentity & { positionSeconds: number; durationSeconds: number; observedAt: number; ended?: boolean };
export const progressKey = (target: ProgressIdentity) => target.mediaType === "demo" ? `demo:${target.demoId}` : target.mediaType === "movie" ? `movie:${target.tmdbId}` : `tv:${target.tmdbId}:${target.seasonNumber}:${target.episodeNumber}`;
export function sourceIdentity(source: PlaybackTarget): ProgressIdentity | null {
  const match = /^tmdb:(movie|tv):([1-9]\d*)$/.exec(source.mediaId);
  const value = match ? { mediaType: match[1], tmdbId: Number(match[2]), ...(match[1] === "tv" ? { seasonNumber: source.season, episodeNumber: source.episode } : {}) } : source.mediaId.startsWith("demo:") ? { mediaType: "demo", demoId: source.mediaId.slice(5) } : null;
  const parsed = progressIdentity.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function progressURL(target: ProgressIdentity) {
  return target.mediaType === "demo" ? `/api/viewing-progress/demo/${target.demoId}` : `/api/viewing-progress/${target.mediaType}/${target.tmdbId}${target.mediaType === "tv" ? `?season=${target.seasonNumber}&episode=${target.episodeNumber}` : ""}`;
}
export function resumePosition(saved: { positionSeconds: number; durationSeconds: number; completed: boolean } | null, duration: number) {
  return saved && !saved.completed && saved.positionSeconds / saved.durationSeconds < COMPLETION_RATIO && Math.abs(saved.durationSeconds - duration) < Math.max(2, duration * 0.02) ? Math.min(saved.positionSeconds, Math.max(0, duration - .25)) : 0;
}
export interface HistoryItem {
  contentKey: string;
  mediaType: "movie" | "tv" | "demo";
  tmdbId: number | null;
  demoId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
  title: string;
  posterUrl: string | null;
  watchHref: string | null;
  playbackAvailable?: boolean;
  detailsHref: string;
}
export function itemIdentity(item: HistoryItem): ProgressIdentity {
  return item.mediaType === "demo" ? { mediaType: "demo", demoId: item.demoId! } : item.mediaType === "movie" ? { mediaType: "movie", tmdbId: item.tmdbId! } : { mediaType: "tv", tmdbId: item.tmdbId!, seasonNumber: item.seasonNumber!, episodeNumber: item.episodeNumber! };
}
