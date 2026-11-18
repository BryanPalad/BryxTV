import type { PlaybackTarget } from "@/types/playback";
import { playbackKey, validTarget } from "./validation";
export type PlaybackProgress = PlaybackTarget & {
  version: 1;
  sourceId: string;
  position: number;
  duration: number;
  lastWatched: number;
  completed: boolean;
};
export const PROGRESS_TTL = 180 * 86400 * 1000;
export const progressStorageKey = (target: PlaybackTarget) =>
  `bryxtv:progress:v1:${playbackKey(target)}`;
export function parseProgress(
  raw: string | null,
  target: PlaybackTarget,
  sourceId: string,
  now = Date.now(),
): PlaybackProgress | null {
  if (!raw || raw.length > 2048 || !validTarget(target)) return null;
  try {
    const p = JSON.parse(raw) as PlaybackProgress;
    if (
      !p ||
      p.version !== 1 ||
      p.sourceId !== sourceId ||
      p.mediaId !== target.mediaId ||
      p.season !== target.season ||
      p.episode !== target.episode ||
      typeof p.completed !== "boolean" ||
      !Number.isFinite(p.position) ||
      !Number.isFinite(p.duration) ||
      p.position < 0 ||
      p.duration <= 0 ||
      p.position > p.duration ||
      !Number.isFinite(p.lastWatched) ||
      p.lastWatched > now + 60000 ||
      now - p.lastWatched > PROGRESS_TTL
    )
      return null;
    return p;
  } catch {
    return null;
  }
}
