import "server-only";
import { getPrisma } from "@/lib/db/prisma";
import { getTVDetails, catalogResult } from "@/lib/providers/tmdb/service";
import { officialEmbedAllowed } from "./official-sources.server";
import { resolvedOptions, type SourceRecord } from "./policy";
import type { MediaItem } from "@/types/catalog";

type CatalogSource = SourceRecord & {
  mediaType: string;
  tmdbId: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
};
export function verifiedCatalogTitleIds(rows: CatalogSource[]) {
  return [
    ...new Set(
      rows
        .filter(
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
        )
        .map((row) => row.tmdbId),
    ),
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
      ids.slice(0, 40).map((id) => catalogResult(() => getTVDetails(id))),
    );
    const titles = items.flatMap((result) => (result.ok ? [result.data] : []));
    return {
      anime: titles.filter(
        (item) => item.originalLanguage === "ja" && item.genreIds.includes(16),
      ),
      drama: titles.filter((item) => item.originalLanguage === "ko"),
    };
  } catch {
    return { anime: [], drama: [] };
  }
}
