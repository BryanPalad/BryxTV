import type { PlaybackSource } from "@/types/playback";
import type { SourceType } from "./registry";
export interface PlaybackOption {
  id: string;
  provider: string;
  label: string;
  type: SourceType;
  sourceUrl: string;
  progressTracking: "videojs" | "unsupported";
  fullscreen: boolean;
  video: PlaybackSource | null;
  preview?: boolean;
}
export interface PlaybackResolution {
  sources: PlaybackOption[];
  pending: boolean;
  unavailable: boolean;
  failed: boolean;
}
