import "server-only";
import { cache } from "react";
import { tmdbRequest } from "./client";
import { validateId } from "./validation";
import { TMDBError } from "./errors";
import { backdropImageUrl } from "./images";
import type { Episode, SeasonSummary } from "@/types/playback";
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object";
export const getTVSeasons = cache(
  async (id: string): Promise<SeasonSummary[]> => {
    const raw = await tmdbRequest(`/tv/${validateId(id)}`, {
      revalidate: 86400,
    });
    if (!record(raw) || !Array.isArray(raw.seasons))
      throw new TMDBError("INVALID_RESPONSE");
    return raw.seasons
      .filter(record)
      .filter(
        (s) =>
          Number.isInteger(s.season_number) &&
          Number(s.season_number) >= 0 &&
          Number(s.season_number) <= 9999,
      )
      .map((s) => ({
        number: Number(s.season_number),
        name: typeof s.name === "string" ? s.name : `Season ${s.season_number}`,
        episodeCount: typeof s.episode_count === "number" ? s.episode_count : 0,
      }));
  },
);
export const getTVEpisodes = cache(
  async (id: string, season: number): Promise<Episode[]> => {
    if (!Number.isInteger(season) || season < 0 || season > 9999)
      throw new TMDBError("INVALID_REQUEST");
    const raw = await tmdbRequest(`/tv/${validateId(id)}/season/${season}`, {
      revalidate: 86400,
    });
    if (!record(raw) || !Array.isArray(raw.episodes))
      throw new TMDBError("INVALID_RESPONSE");
    return raw.episodes
      .filter(record)
      .filter(
        (e) =>
          Number.isInteger(e.episode_number) &&
          Number(e.episode_number) > 0 &&
          Number(e.episode_number) <= 9999 &&
          e.season_number === season,
      )
      .map((e) => ({
        number: Number(e.episode_number),
        season,
        title:
          typeof e.name === "string" ? e.name : `Episode ${e.episode_number}`,
        description:
          typeof e.overview === "string"
            ? e.overview
            : "Description unavailable.",
        thumbnail: backdropImageUrl(e.still_path),
        runtime:
          typeof e.runtime === "number" && e.runtime > 0 ? e.runtime : null,
      }));
  },
);
