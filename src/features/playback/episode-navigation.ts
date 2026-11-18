import type { Episode, SeasonSummary } from "@/types/playback";
/** Metadata order only: availability must never change which episode is adjacent. */
export function adjacentEpisode(
  episodes: Episode[],
  current: number,
  direction: -1 | 1,
) {
  const ordered = [...episodes].sort((a, b) => a.number - b.number);
  const index = ordered.findIndex((episode) => episode.number === current);
  return index < 0 ? null : (ordered[index + direction] ?? null);
}
export function adjacentSeason(
  seasons: SeasonSummary[],
  current: number,
  direction: -1 | 1,
) {
  // Specials are a separate list, not an implicit previous season of Season 1.
  const ordered = seasons
    .filter((season) => season.number > 0)
    .sort((a, b) => a.number - b.number);
  const index = ordered.findIndex((season) => season.number === current);
  return index < 0 ? null : (ordered[index + direction] ?? null);
}

import {
  officialMatches,
  officialWatchUrl,
  viewingState,
  type OfficialSource,
} from "./providers/official-policy";
export function episodeDestination(
  id: number,
  episode: Episode,
  playable: boolean,
  reviews: OfficialSource[],
  pending = false,
) {
  const rows = reviews.filter((row) =>
    officialMatches(row, "tv", id, episode.season, episode.number),
  );
  const state = viewingState(playable, rows, pending);
  if (playable)
    return {
      state,
      href: `/watch/tv/${id}?season=${episode.season}&episode=${episode.number}`,
      external: false,
    };
  const provider =
    state === "WATCH_ON_PROVIDER"
      ? rows.find(
          (row) =>
            row.status === "WATCH_ON_PROVIDER" &&
            row.uploaderVerified &&
            row.mappingVerified &&
            row.region !== "RESTRICTED_PH" &&
            row.embedding !== "UNKNOWN",
        )
      : null;
  return {
    state,
    href: provider ? officialWatchUrl(provider) : null,
    external: !!provider,
  };
}
