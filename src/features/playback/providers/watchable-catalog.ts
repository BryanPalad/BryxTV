import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { getTVDetails, catalogResult } from "@/lib/providers/tmdb/service";
import {
  officialEmbedAllowed,
  officialSources,
} from "./official-sources.server";
import { resolvedOptions, type SourceRecord } from "./policy";
import type { MediaItem } from "@/types/catalog";
import { getTVSeasons } from "@/lib/providers/tmdb/episodes";
import {
  compareApprovedSeries,
  completeSeason,
  longestRun,
} from "../discovery/ranking";

type CatalogSource = SourceRecord & {
  mediaType: string;
  tmdbId: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
};
export function verifiedCatalogSources(rows: CatalogSource[]) {
  return rows.filter(
    (row) =>
      row.mediaType === "tv" &&
      (row.provider.slug !== "youtube-privacy" ||
        officialEmbedAllowed(
          row.sourceUrl,
          "tv",
          row.tmdbId,
          row.seasonNumber ?? undefined,
          row.episodeNumber ?? undefined,
        )) &&
      resolvedOptions([row], {
        mediaId: `tmdb:tv:${row.tmdbId}`,
        season: row.seasonNumber ?? undefined,
        episode: row.episodeNumber ?? undefined,
      }).length > 0,
  );
}
export function verifiedCatalogTitleIds(rows: CatalogSource[]) {
  return [
    ...new Set(verifiedCatalogSources(rows).map((row) => row.tmdbId)),
  ].sort((a, b) => a - b);
}

/** Re-evaluate the same approval gates as the player; metadata alone is never playable. */
export async function watchableCatalog(): Promise<{
  anime: MediaItem[];
  drama: MediaItem[];
}> {
  try {
    const rows = await getPrisma().playbackSource.findMany({
      where: {
        mediaType: "tv",
        enabled: true,
        availabilityStatus: "AVAILABLE",
      },
      include: { provider: true },
    });
    const ids = verifiedCatalogTitleIds(rows);
    const items = await Promise.all(
      ids.map((id) => catalogResult(() => getTVDetails(id))),
    );
    const titles = items.flatMap((result) => (result.ok ? [result.data] : []));
    const approved = verifiedCatalogSources(rows);
    const ranked = await Promise.all(
      titles.map(async (item) => {
        const seasons = await catalogResult(() =>
          getTVSeasons(String(item.externalId)),
        );
        const numbers = new Map<number, number[]>();
        for (const row of approved.filter(
          (row) => row.tmdbId === item.externalId,
        )) {
          if (row.seasonNumber !== null && row.episodeNumber !== null)
            numbers.set(row.seasonNumber, [
              ...(numbers.get(row.seasonNumber) ?? []),
              row.episodeNumber,
            ]);
        }
        return {
          item,
          rank: {
            id: item.externalId,
            completeSeasons: seasons.ok
              ? seasons.data.filter(
                  (season) =>
                    season.number > 0 &&
                    completeSeason(
                      numbers.get(season.number) ?? [],
                      season.episodeCount,
                    ),
                ).length
              : 0,
            longestConsecutive: Math.max(
              0,
              ...[...numbers.values()].map(longestRun),
            ),
            verifiedEpisodes: [...numbers.values()].reduce(
              (sum, episodes) => sum + new Set(episodes).size,
              0,
            ),
            popularity: item.popularity,
            englishReviewedEpisodes: new Set(
              approved
                .filter(
                  (row) =>
                    row.tmdbId === item.externalId &&
                    officialSources(
                      "tv",
                      row.tmdbId,
                      row.seasonNumber ?? undefined,
                      row.episodeNumber ?? undefined,
                    ).some(
                      (review) =>
                        review.status === "WATCH_ON_BRYXTV" &&
                        review.subtitles.includes("en") &&
                        row.sourceUrl ===
                          `https://www.youtube-nocookie.com/embed/${review.videoId}`,
                    ),
                )
                .map((row) => row.contentKey),
            ).size,
            philippinesReviewedEpisodes: new Set(
              approved
                .filter(
                  (row) =>
                    row.tmdbId === item.externalId &&
                    officialSources(
                      "tv",
                      row.tmdbId,
                      row.seasonNumber ?? undefined,
                      row.episodeNumber ?? undefined,
                    ).some(
                      (review) =>
                        review.status === "WATCH_ON_BRYXTV" &&
                        review.region === "AVAILABLE_PH" &&
                        row.sourceUrl ===
                          `https://www.youtube-nocookie.com/embed/${review.videoId}`,
                    ),
                )
                .map((row) => row.contentKey),
            ).size,
          },
        };
      }),
    );
    const ordered = ranked
      .sort((a, b) => compareApprovedSeries(a.rank, b.rank))
      .slice(0, 40)
      .map((row) => row.item);
    return {
      anime: ordered.filter(
        (item) => item.originalLanguage === "ja" && item.genreIds.includes(16),
      ),
      drama: ordered.filter((item) => item.originalLanguage === "ko"),
    };
  } catch {
    return { anime: [], drama: [] };
  }
}
