import type { PlaybackSource, PlaybackTarget } from "@/types/playback";

// Add reviewed CDN origins here and to the CSP before onboarding a provider.
export const PLAYBACK_ORIGINS: readonly string[] = [];
export function validPlaybackUrl(
  value: string,
  origins = PLAYBACK_ORIGINS,
): boolean {
  if (
    /^\/playback\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(mp4|m3u8)$/.test(
      value,
    ) ||
    /^\/subtitles\/[a-zA-Z0-9_.-]+\.vtt$/.test(value)
  )
    return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      origins.includes(url.origin) &&
      !url.hash
    );
  } catch {
    return false;
  }
}
export function episodeParam(value: unknown, minimum = 1): number | null {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,3})$/.test(value))
    return null;
  const n = Number(value);
  return n >= minimum && n <= 9999 ? n : null;
}
export function validTarget(target: PlaybackTarget): boolean {
  if (!/^(tmdb:(movie|tv):[1-9]\d*|demo:[a-z0-9-]+)$/.test(target.mediaId))
    return false;
  if (target.mediaId.startsWith("tmdb:tv:"))
    return (
      Number.isSafeInteger(target.season) &&
      target.season! >= 0 &&
      target.season! <= 9999 &&
      Number.isSafeInteger(target.episode) &&
      target.episode! > 0 &&
      target.episode! <= 9999
    );
  return target.season === undefined && target.episode === undefined;
}
export function sourceMatches(
  source: PlaybackSource,
  target: PlaybackTarget,
): boolean {
  return (
    validTarget(target) &&
    source.authorized === true &&
    source.mediaId === target.mediaId &&
    source.season === target.season &&
    source.episode === target.episode &&
    validPlaybackUrl(source.sourceUrl) &&
    ["mp4", "hls"].includes(source.sourceType) &&
    (source.subtitles ?? []).every((track) => validPlaybackUrl(track.src))
  );
}
export function playbackKey(target: PlaybackTarget) {
  return `${target.mediaId}:${target.season ?? "movie"}:${target.episode ?? "main"}`;
}
