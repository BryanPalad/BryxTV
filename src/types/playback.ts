export type SubtitleTrack = {
  src: string;
  language: string;
  label: string;
  default?: boolean;
};
export type PlaybackTarget = {
  mediaId: string;
  season?: number | undefined;
  episode?: number | undefined;
};
export type PlaybackSource = PlaybackTarget & {
  id: string;
  sourceUrl: string;
  sourceType: "mp4" | "hls";
  title: string;
  description: string;
  subtitles?: SubtitleTrack[];
  posterUrl?: string;
  authorized: boolean;
  attribution: {
    creator: string;
    provider: string;
    source: string;
    license: string;
    licenseUrl: string;
    changes: string;
  };
};
export type SeasonSummary = {
  number: number;
  name: string;
  episodeCount: number;
};
export type Episode = {
  number: number;
  season: number;
  title: string;
  description: string;
  thumbnail: string | null;
  runtime: number | null;
};
