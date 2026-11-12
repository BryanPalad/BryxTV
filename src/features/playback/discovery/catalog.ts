import "server-only";
import { tmdbRequest } from "@/lib/providers/tmdb/client";
import type { CatalogMapping, DiscoveryVideo } from "./types";
import { normalizeTitle } from "./matching";
const seeds = [
  {
    id: 63926,
    title: "One-Punch Man",
    aliases: ["One Punch Man"],
    type: "anime",
  },
  {
    id: 1429,
    title: "Attack on Titan",
    aliases: ["Shingeki no Kyojin"],
    type: "anime",
  },
  {
    id: 85937,
    title: "Demon Slayer",
    aliases: ["Kimetsu no Yaiba"],
    type: "anime",
  },
  { id: 95479, title: "Jujutsu Kaisen", aliases: [], type: "anime" },
  { id: 127532, title: "Solo Leveling", aliases: [], type: "anime" },
  { id: 215720, title: "Queen of Tears", aliases: [], type: "kdrama" },
  { id: 230923, title: "Lovely Runner", aliases: [], type: "kdrama" },
  { id: 117376, title: "Vincenzo", aliases: [], type: "kdrama" },
  { id: 154825, title: "Business Proposal", aliases: [], type: "kdrama" },
  { id: 72165, title: "Sirius", aliases: [], type: "kdrama" },
] as const;
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
/** Read-only metadata enrichment for bounded known discovery targets, not playback evidence. */
export async function loadDiscoveryCatalog(
  videos: DiscoveryVideo[],
  series?: string,
): Promise<CatalogMapping[]> {
  const output: CatalogMapping[] = [];
  for (const seed of seeds) {
    if (
      !videos.some((video) =>
        [seed.title, ...seed.aliases].some((alias) =>
          normalizeTitle(video.title).includes(normalizeTitle(alias)),
        ),
      ) &&
      (!series ||
        ![seed.title, ...seed.aliases].some(
          (alias) => normalizeTitle(alias) === normalizeTitle(series),
        ))
    )
      continue;
    const detail = record(
      await tmdbRequest(`/tv/${seed.id}`, { revalidate: 86400 }),
    );
    const alternate = record(
      await tmdbRequest(`/tv/${seed.id}/alternative_titles`, {
        revalidate: 86400,
      }),
    );
    const requested = new Set(
      videos.flatMap((video) => {
        const match = /\bS(\d+)\s*E\d+|\bSeason\s*(\d+)/i.exec(video.title);
        return match ? [Number(match[1] ?? match[2])] : [];
      }),
    );
    const seasons: CatalogMapping["seasons"] = [];
    for (const raw of (Array.isArray(detail.seasons)
      ? detail.seasons
      : []
    ).slice(0, 30)) {
      const season = record(raw);
      if (
        typeof season.season_number !== "number" ||
        !requested.has(season.season_number)
      )
        continue;
      const data = record(
        await tmdbRequest(`/tv/${seed.id}/season/${season.season_number}`, {
          revalidate: 86400,
        }),
      );
      seasons.push({
        number: season.season_number,
        episodes: (Array.isArray(data.episodes) ? data.episodes : []).flatMap(
          (raw) => {
            const episode = record(raw);
            return typeof episode.episode_number === "number" &&
              typeof episode.name === "string"
              ? [
                  {
                    number: episode.episode_number,
                    title: episode.name,
                    airDate:
                      typeof episode.air_date === "string"
                        ? episode.air_date
                        : null,
                  },
                ]
              : [];
          },
        ),
      });
    }
    output.push({
      mediaType: "tv",
      tmdbId: seed.id,
      title: typeof detail.name === "string" ? detail.name : seed.title,
      aliases: [
        ...seed.aliases,
        ...(typeof detail.original_name === "string"
          ? [detail.original_name]
          : []),
        ...(Array.isArray(alternate.results) ? alternate.results : []).flatMap(
          (raw) => {
            const row = record(raw);
            return typeof row.title === "string" ? [row.title] : [];
          },
        ),
      ],
      originalLanguage:
        typeof detail.original_language === "string"
          ? detail.original_language
          : "",
      genres: (Array.isArray(detail.genres) ? detail.genres : []).flatMap(
        (raw) => {
          const row = record(raw);
          return typeof row.id === "number" ? [row.id] : [];
        },
      ),
      popularity: typeof detail.popularity === "number" ? detail.popularity : 0,
      releaseDate:
        typeof detail.first_air_date === "string"
          ? detail.first_air_date
          : null,
      seasons,
    });
  }
  return output;
}
