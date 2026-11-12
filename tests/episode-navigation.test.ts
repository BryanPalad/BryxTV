import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adjacentEpisode,
  adjacentSeason,
} from "../src/features/playback/episode-navigation";
import {
  officialManifestSchema,
  officialSourceSchema,
} from "../src/features/playback/providers/official-policy";
import manifest from "../src/features/playback/data/official-sources.json";
const episodes = [3, 1, 2].map((number) => ({
  number,
  season: 1,
  title: `Episode ${number}`,
  description: "",
  thumbnail: null,
  runtime: 24,
}));
test("neighbors follow metadata order without skipping unavailable episodes", () => {
  assert.equal(adjacentEpisode(episodes, 1, 1)?.number, 2);
  assert.equal(adjacentEpisode(episodes, 3, -1)?.number, 2);
  assert.equal(adjacentEpisode(episodes, 1, -1), null);
  assert.equal(adjacentEpisode(episodes, 99, 1), null);
  assert.deepEqual(
    episodes.map((e) => e.number),
    [3, 1, 2],
  );
});
test("season boundaries use supported seasons without folding specials into Season 1", () => {
  const seasons = [3, 0, 1, 2].map((number) => ({
    number,
    name: `Season ${number}`,
    episodeCount: 12,
  }));
  assert.equal(adjacentSeason(seasons, 1, 1)?.number, 2);
  assert.equal(adjacentSeason(seasons, 2, -1)?.number, 1);
  assert.equal(adjacentSeason(seasons, 1, -1), null);
  assert.equal(adjacentSeason(seasons, 3, 1), null);
  assert.equal(adjacentSeason(seasons, 0, 1), null);
});
test("different videos cannot silently duplicate the same episode mapping", () => {
  const row = officialSourceSchema.parse(
    manifest.find((row) => row.format === "EPISODE"),
  );
  assert.equal(
    officialManifestSchema.safeParse([
      row,
      { ...row, key: "alternate", videoId: "abcdefghijk" },
    ]).success,
    false,
  );
  assert.equal(
    officialManifestSchema.safeParse([
      row,
      { ...row, key: "next-episode", videoId: "abcdefghijk", episode: 2 },
    ]).success,
    true,
  );
});

test("navigation offers exact internal targets, explicit provider links, and no link for unknown/unavailable", async () => {
  const { episodeDestination } =
    await import("../src/features/playback/episode-navigation");
  const e = episodes[2]!;
  const row = officialSourceSchema.parse(
    manifest.find((row) => row.key === "muse-one-punch-man-s3e1"),
  );
  const provider = {
    ...row,
    tmdbId: 63926,
    season: e.season,
    episode: e.number,
    status: "WATCH_ON_PROVIDER" as const,
    embedding: "BLOCKED" as const,
  };
  assert.equal(
    episodeDestination(63926, e, true, []).href,
    "/watch/tv/63926?season=1&episode=2",
  );
  assert.deepEqual(episodeDestination(63926, e, false, [provider]), {
    state: "UNAVAILABLE",
    href: null,
    external: false,
  });
  for (const patch of [
    { status: "UNKNOWN" as const },
    { enabled: false },
    { region: "RESTRICTED_PH" as const },
    { episode: 99 },
    { uploaderVerified: false },
  ])
    assert.equal(
      episodeDestination(63926, e, false, [{ ...provider, ...patch }]).href,
      null,
    );
  assert.equal(episodeDestination(63926, e, false, [], true).state, "UNKNOWN");
  assert.equal(episodeDestination(63926, e, false, []).state, "UNAVAILABLE");
});
