import Link from "next/link";
import { getTVEpisodes, getTVSeasons } from "@/lib/providers/tmdb/episodes";
import { catalogResult } from "@/lib/providers/tmdb/service";
import {
  adjacentEpisode,
  adjacentSeason,
  episodeDestination,
} from "../episode-navigation";
import { titleAvailability } from "../providers/resolver";
import { officialSources } from "../providers/official-sources.server";

export async function EpisodeNavigation({
  id,
  season,
  episode,
}: {
  id: string;
  season: number;
  episode: number;
}) {
  const metadata = await catalogResult(async () => ({
    seasons: await getTVSeasons(id),
    episodes: await getTVEpisodes(id, season),
  }));
  const back = (
    <Link
      className="playback-button"
      href={`/tv/${id}?season=${season}#episodes-heading`}
    >
      Back to Episode List
    </Link>
  );
  if (!metadata.ok)
    return (
      <nav className="episode-navigation" aria-label="Episode navigation">
        {back}
        <p>Episode navigation is temporarily unavailable.</p>
      </nav>
    );
  const { seasons, episodes } = metadata.data;
  if (!episodes.some((item) => item.number === episode))
    return (
      <nav className="episode-navigation" aria-label="Episode navigation">
        {back}
      </nav>
    );
  const availability = await titleAvailability("tv", Number(id));
  const neighbors = await Promise.all(
    ([-1, 1] as const).map(async (direction) => {
      let neighbor = adjacentEpisode(episodes, episode, direction);
      let failed = false;
      if (!neighbor) {
        const nextSeason = adjacentSeason(seasons, season, direction);
        if (nextSeason) {
          const result = await catalogResult(() =>
            getTVEpisodes(id, nextSeason.number),
          );
          if (result.ok) {
            const ordered = [...result.data].sort(
              (a, b) => a.number - b.number,
            );
            neighbor = (direction === 1 ? ordered[0] : ordered.at(-1)) ?? null;
          } else failed = true;
        }
      }
      const label = direction === -1 ? "Previous Episode" : "Next Episode";
      if (!neighbor)
        return (
          <div key={label} className="episode-neighbor">
            <span aria-disabled="true">{label}</span>
            <small>
              {failed ? "Episode metadata unavailable" : "No adjacent episode"}
            </small>
          </div>
        );
      const rows = officialSources(
        "tv",
        Number(id),
        neighbor.season,
        neighbor.number,
      );
      const playable = availability.sources.some(
        (row) =>
          row.seasonNumber === neighbor.season &&
          row.episodeNumber === neighbor.number,
      );
      const destination = episodeDestination(
        Number(id),
        neighbor,
        playable,
        rows,
        availability.failed ||
          availability.pendingKeys.includes(
            `tv:${id}:${neighbor.season}:${neighbor.number}`,
          ),
      );
      const caption = `S${neighbor.season} · E${neighbor.number} — ${neighbor.title}`;
      return (
        <div key={label} className="episode-neighbor">
          {destination.href ? (
            destination.external ? (
              <a
                className="playback-button"
                href={destination.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label} — Watch on Provider ↗
              </a>
            ) : (
              <Link className="playback-button" href={destination.href}>
                {label}
              </Link>
            )
          ) : (
            <span aria-disabled="true">
              {label} —{" "}
              {destination.state === "UNKNOWN"
                ? "Verification pending"
                : "Unavailable"}
            </span>
          )}
          <small>{caption}</small>
        </div>
      );
    }),
  );
  return (
    <nav className="episode-navigation" aria-label="Episode navigation">
      {neighbors[0]}
      {back}
      {neighbors[1]}
    </nav>
  );
}
