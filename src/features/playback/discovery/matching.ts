import type { CatalogMapping, DiscoveryVideo, Match } from "./types";
export const normalizeTitle = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const unknown = (reason: string): Match => ({
  tmdbId: null,
  mediaType: null,
  title: null,
  season: null,
  episode: null,
  confidence: "LOW",
  reason,
});
export function matchVideo(
  video: DiscoveryVideo,
  catalog: CatalogMapping[],
  kind: string,
): Match {
  if (!["FULL_EPISODE", "FULL_MOVIE"].includes(kind))
    return unknown("Non-individual content is not mapped to an episode.");
  const title = normalizeTitle(video.title);
  const matches = catalog.filter((item) =>
    [item.title, ...item.aliases].some((alias) => {
      const n = normalizeTitle(alias);
      return n.length >= 2 && ` ${title} `.includes(` ${n} `);
    }),
  );
  if (matches.length !== 1)
    return unknown(
      matches.length
        ? "Multiple catalog titles match; select a reviewed TMDB identity."
        : "No exact title or reviewed alternate title matched.",
    );
  const item = matches[0]!;
  const base = {
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
    title: item.title,
    season: null,
    episode: null,
  } as const;
  const year = /\b((?:19|20)\d{2})\b/.exec(video.title)?.[1];
  if (kind === "FULL_MOVIE")
    return item.mediaType === "movie"
      ? {
          ...base,
          confidence:
            year && item.releaseDate?.startsWith(year) ? "HIGH" : "MEDIUM",
          reason:
            "Exact movie title; release year required for higher confidence. Full-film review still required.",
        }
      : unknown(
          "Movie claim matched TV metadata; do not guess an anthology mapping.",
        );
  if (item.mediaType !== "tv")
    return unknown("Episode claim matched a movie; review required.");
  const compact = /\bS(\d{1,4})\s*E(\d{1,4})\b/i.exec(video.title);
  const season = /\bseason\s*(\d{1,4})\b/i.exec(video.title);
  const episode = /\b(?:episode|ep)\.?\s*(\d{1,4})(?!\d)/i.exec(video.title);
  const s = Number(compact?.[1] ?? season?.[1]),
    e = Number(compact?.[2] ?? episode?.[1]);
  if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e < 1)
    return {
      ...base,
      confidence: "MEDIUM",
      reason:
        "Series matched, but explicit season/episode missing. Absolute anime numbering is not converted automatically.",
    };
  const metadata = item.seasons
    .find((row) => row.number === s)
    ?.episodes.find((row) => row.number === e);
  if (!metadata)
    return {
      ...base,
      confidence: "LOW",
      reason:
        "Publisher season/episode is not present in fetched TMDB metadata; season numbering requires review.",
    };
  const episodeNamed =
    normalizeTitle(metadata.title).length >= 4 &&
    ` ${normalizeTitle(video.title + " " + video.description)} `.includes(
      ` ${normalizeTitle(metadata.title)} `,
    ) &&
    !/^episode \d+$/.test(normalizeTitle(metadata.title));
  return {
    ...base,
    season: s,
    episode: e,
    confidence: episodeNamed ? "HIGH" : "MEDIUM",
    reason: episodeNamed
      ? "Exact series alias, explicit season/episode and TMDB episode name agree; review still required."
      : "Explicit numbering matches metadata, but an episode-name cross-check is missing. Review season alignment.",
  };
}
