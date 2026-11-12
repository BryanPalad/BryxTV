import type { Candidate, CatalogMapping, SeasonOpportunity } from "./types";
export function longestRun(numbers: number[]) {
  let best = 0,
    run = 0,
    previous = -2;
  for (const n of [...new Set(numbers)].sort((a, b) => a - b)) {
    run = n === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = n;
  }
  return best;
}
export function completeSeason(numbers: number[], expected: number) {
  const ids = new Set(numbers);
  return (
    expected > 0 &&
    Array.from({ length: expected }, (_, i) => i + 1).every((n) => ids.has(n))
  );
}
export function seasonOpportunities(
  candidates: Candidate[],
  catalog: CatalogMapping[],
): SeasonOpportunity[] {
  const groups = new Map<string, Candidate[]>();
  for (const row of candidates) {
    if (
      row.reviewDecision === "REJECTED" ||
      row.classification !== "FULL_EPISODE" ||
      row.match.tmdbId === null ||
      row.match.season === null ||
      row.match.episode === null ||
      row.duplicateReasons.length
    )
      continue;
    const key = `${row.match.tmdbId}:${row.match.season}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()]
    .map((rows) => {
      const first = rows[0]!,
        tmdbId = first.match.tmdbId!,
        season = first.match.season!,
        item = catalog.find(
          (item) => item.tmdbId === tmdbId && item.mediaType === "tv",
        ),
        metadata =
          item?.seasons.find((item) => item.number === season)?.episodes ?? [],
        numbers = rows.map((row) => row.match.episode!);
      const run = longestRun(numbers),
        complete =
          metadata.length > 0 &&
          metadata.every((e) => numbers.includes(e.number));
      return {
        tmdbId,
        title: first.match.title!,
        season,
        expectedEpisodes: metadata.length,
        candidateEpisodes: new Set(numbers).size,
        longestCandidateRun: run,
        candidateCompleteSeason: complete,
        verifiedEpisodes: 0,
        longestVerifiedRun: 0,
        verifiedCompleteSeason: false,
        score:
          (complete ? 100000 : 0) +
          run * 1000 +
          new Set(numbers).size * 100 +
          (item?.popularity ?? 0) +
          rows.filter((r) => r.subtitleAvailability === "PUBLISHER_CLAIM_EN")
            .length,
      };
    })
    .sort(
      (a, b) => b.score - a.score || a.tmdbId - b.tmdbId || a.season - b.season,
    );
}
export interface ApprovedSeriesRank {
  id: number;
  completeSeasons: number;
  longestConsecutive: number;
  verifiedEpisodes: number;
  popularity: number;
  englishReviewedEpisodes?: number;
  philippinesReviewedEpisodes?: number;
}
export function compareApprovedSeries(
  a: ApprovedSeriesRank,
  b: ApprovedSeriesRank,
) {
  return (
    b.completeSeasons - a.completeSeasons ||
    b.longestConsecutive - a.longestConsecutive ||
    b.verifiedEpisodes - a.verifiedEpisodes ||
    (b.philippinesReviewedEpisodes ?? 0) -
      (a.philippinesReviewedEpisodes ?? 0) ||
    (b.englishReviewedEpisodes ?? 0) - (a.englishReviewedEpisodes ?? 0) ||
    b.popularity - a.popularity ||
    a.id - b.id
  );
}
