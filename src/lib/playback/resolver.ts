import "server-only";
import { authorizedSources } from "@/features/playback/data/sources";
import { sourceMatches } from "./validation";
import type { PlaybackTarget } from "@/types/playback";

/** Future provider adapters may mint short-lived URLs here after entitlement checks.
 * Registry entries must contain public playback URLs, never storage credentials.
 */
export function resolvePlayback(target: PlaybackTarget) {
  return (
    authorizedSources.find((source) => sourceMatches(source, target)) ?? null
  );
}
export function demoSources() {
  return authorizedSources.filter(
    (source) =>
      source.mediaId.startsWith("demo:") && sourceMatches(source, source),
  );
}

export function firstPlaybackForMedia(mediaId: string) {
  return (
    authorizedSources.find(
      (source) => source.mediaId === mediaId && sourceMatches(source, source),
    ) ?? null
  );
}
