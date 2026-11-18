import "server-only";
import type { PlaybackSource } from "@/types/playback";
import { validationAllowed, validationMovieURL, validValidationMovieURL } from "./validation-policy";

/** Local-only fixture: deliberately separate from catalog and database approvals. */
export function validationSource(env: Record<string, string | undefined>, host: string): PlaybackSource | null {
  if (!validationAllowed(env, host) || !validValidationMovieURL(validationMovieURL)) return null;
  return {
    id: "bbb-complete-development-v1", mediaId: "demo:bbb-complete-development",
    sourceUrl: validationMovieURL, sourceType: "mp4", crossOrigin: null,
    title: "Big Buck Bunny (2008) — complete film, local validation",
    description: "Development-only playback test. Official Blender 720p, 24fps MP4, 596.566 seconds. Not anime catalog content.",
    authorized: true,
    attribution: {
      creator: "© copyright 2008, Blender Foundation / www.bigbuckbunny.org",
      provider: "Blender — official video.blender.org service",
      source: "https://video.blender.org/w/pAQiVCgv2CsLg79KKXUoMw",
      license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      changes: "No edits by BryxTV. Publisher-hosted encoding. The complete ending credits are retained; watch them for the full film attribution.",
    },
  };
}
