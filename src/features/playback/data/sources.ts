import "server-only";
import type { PlaybackSource } from "@/types/playback";

/** Reviewed rights registry. Never populate this from TMDB or a request URL. */
export const playbackSources: readonly PlaybackSource[] = [
  {
    id: "bbb-excerpt-v1",
    mediaId: "demo:big-buck-bunny",
    sourceUrl: "/playback/big-buck-bunny-excerpt.mp4",
    sourceType: "mp4",
    title: "Big Buck Bunny — sample excerpt",
    description:
      "A ten-second excerpt from Blender Foundation's open movie. This independent demo validates playback and captions; it is not a commercial catalog stream.",
    authorized: true,
    subtitles: [
      {
        src: "/subtitles/bbb-demo.en.vtt",
        language: "en",
        label: "English — demo descriptions",
        default: true,
      },
    ],
    attribution: {
      creator: "© copyright 2008, Blender Foundation / www.bigbuckbunny.org",
      provider: "Test Videos (local copy)",
      source:
        "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      changes:
        "Ten-second excerpt, resized and encoded by Test Videos. BryxTV adds original descriptive demonstration captions; these are not dialogue subtitles.",
    },
  },
];

/** Same licensed excerpt, locally repackaged as MPEG-TS HLS without re-encoding. */
const mp4Demo = playbackSources[0]!;
export const hlsDemo: PlaybackSource = {
  ...mp4Demo,
  id: "bbb-hls-excerpt-v1",
  mediaId: "demo:big-buck-bunny-hls",
  sourceUrl: "/playback/bbb-hls/index.m3u8",
  sourceType: "hls",
  title: "Big Buck Bunny — HLS sample excerpt",
  attribution: {
    ...mp4Demo.attribution,
    changes: `${mp4Demo.attribution.changes} BryxTV repackages the same excerpt into HLS without re-encoding.`,
  },
};
export const authorizedSources: readonly PlaybackSource[] = [
  ...playbackSources,
  hlsDemo,
];
