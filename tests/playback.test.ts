import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolvePlayback, demoSources } from "../src/lib/playback/resolver";
import {
  validPlaybackUrl,
  episodeParam,
  sourceMatches,
} from "../src/lib/playback/validation";
import {
  parseProgress,
  progressStorageKey,
  PROGRESS_TTL,
} from "../src/lib/playback/progress";
import {
  getTVSeasons,
  getTVEpisodes,
} from "../src/lib/providers/tmdb/episodes";
import type { PlaybackProgress } from "../src/lib/playback/progress";

test("resolver only returns explicitly authorized exact IDs and episode mappings", () => {
  const demo = resolvePlayback({ mediaId: "demo:big-buck-bunny" });
  assert.ok(demo);
  assert.equal(demo.sourceType, "mp4");
  assert.equal(resolvePlayback({ mediaId: "tmdb:movie:42" }), null);
  assert.equal(
    resolvePlayback({ mediaId: "https://evil.test/video.mp4" }),
    null,
  );
  assert.equal(
    resolvePlayback({ mediaId: "demo:big-buck-bunny", season: 1, episode: 1 }),
    null,
  );
  assert.equal(sourceMatches({ ...demo, authorized: false }, demo), false);
  assert.equal(
    sourceMatches({ ...demo, sourceUrl: "https://evil.test/video.mp4" }, demo),
    false,
  );
  const tv = { ...demo, mediaId: "tmdb:tv:42", season: 1, episode: 2 };
  assert.equal(sourceMatches(tv, tv), true);
  assert.equal(sourceMatches(tv, { ...tv, episode: 3 }), false);
  assert.equal(sourceMatches(tv, { mediaId: tv.mediaId }), false);
});

test("playback URL validation rejects arbitrary protocols, origins, credentials, and traversal", () => {
  for (const url of [
    "http://cdn.test/a.mp4",
    "https://evil.test/a.mp4",
    "//evil.test/a.mp4",
    "/playback/../secret.mp4",
    "data:video/mp4;base64,x",
    "javascript:alert(1)",
    "/api/proxy?url=evil",
    "/playback/a.mp4?token=private",
  ])
    assert.equal(validPlaybackUrl(url), false, url);
  assert.equal(
    validPlaybackUrl("https://cdn.test/video.mp4", ["https://cdn.test"]),
    true,
  );
  assert.equal(
    validPlaybackUrl("https://user:password@cdn.test/video.mp4", [
      "https://cdn.test",
    ]),
    false,
  );
  assert.equal(validPlaybackUrl("/playback/bbb-hls/index.m3u8"), true);
  assert.equal(validPlaybackUrl("/subtitles/bbb-demo.en.vtt"), true);
});

test("episode URL parameters reject arrays, decimals, negatives, and oversized values", () => {
  assert.equal(episodeParam("0", 0), 0);
  assert.equal(episodeParam("0"), null);
  assert.equal(episodeParam("12"), 12);
  for (const value of [
    undefined,
    ["1"],
    "01",
    "1.5",
    "-1",
    "10000",
    "1e2",
    "../1",
  ])
    assert.equal(episodeParam(value), null);
});

test("progress is versioned, source-specific, expiring, and isolated by episode", () => {
  const target = { mediaId: "tmdb:tv:42", season: 1, episode: 2 };
  const now = Date.now();
  const progress: PlaybackProgress = {
    ...target,
    version: 1,
    sourceId: "licensed-v1",
    position: 30,
    duration: 120,
    lastWatched: now,
    completed: false,
  };
  const parse = (p: object) =>
    parseProgress(JSON.stringify(p), target, progress.sourceId, now);
  assert.deepEqual(parse(progress), progress);
  for (const override of [
    { version: 2 },
    { sourceId: "old" },
    { episode: 3 },
    { position: -1 },
    { position: 121 },
    { duration: 0 },
    { completed: "false" },
    { lastWatched: now - PROGRESS_TTL - 1 },
    { lastWatched: now + 120000 },
  ])
    assert.equal(parse({ ...progress, ...override }), null);
  assert.equal(parseProgress("{broken", target, progress.sourceId), null);
  assert.equal(parseProgress("null", target, progress.sourceId), null);
  assert.notEqual(
    progressStorageKey(target),
    progressStorageKey({ ...target, episode: 3 }),
  );
});

test("all demo assets, captions, and HLS segments exist locally with attribution", () => {
  const demos = demoSources();
  assert.equal(demos.length, 2);
  for (const source of demos) {
    assert.ok(existsSync(`public${source.sourceUrl}`));
    assert.equal(source.attribution.license, "CC BY 3.0");
    for (const track of source.subtitles ?? [])
      assert.match(readFileSync(`public${track.src}`, "utf8"), /^WEBVTT/);
  }
  const hls = readFileSync("public/playback/bbb-hls/index.m3u8", "utf8");
  assert.match(hls, /#EXT-X-ENDLIST/);
  for (const segment of hls
    .split("\n")
    .filter((line) => line && !line.startsWith("#")))
    assert.ok(existsSync(`public/playback/bbb-hls/${segment}`));
  assert.ok(existsSync("public/playback/bbb-hls/init.mp4"));
});

test("TMDB season and episode metadata validates responses and preserves cache lifetime", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.TMDB_READ_ACCESS_TOKEN;
  process.env.TMDB_READ_ACCESS_TOKEN = "test-only-token";
  const paths: string[] = [];
  globalThis.fetch = (async (input, init) => {
    const path = new URL(String(input)).pathname;
    paths.push(path);
    assert.equal(
      (init as RequestInit & { next: { revalidate: number } }).next.revalidate,
      86400,
    );
    return new Response(
      JSON.stringify(
        path.endsWith("/season/1")
          ? {
              episodes: [
                {
                  episode_number: 1,
                  season_number: 1,
                  name: "Pilot",
                  overview: "Opening episode",
                  still_path: "/still.jpg",
                  runtime: 42,
                },
                { episode_number: -1, season_number: 1 },
                { episode_number: 2, season_number: 9 },
              ],
            }
          : {
              seasons: [
                { season_number: 1, name: "Season 1", episode_count: 8 },
                { season_number: -2 },
              ],
            },
      ),
    );
  }) as typeof fetch;
  try {
    assert.deepEqual(await getTVSeasons("42"), [
      { number: 1, name: "Season 1", episodeCount: 8 },
    ]);
    const episodes = await getTVEpisodes("42", 1);
    assert.equal(episodes.length, 1);
    assert.equal(episodes[0]?.runtime, 42);
    assert.equal(
      episodes[0]?.thumbnail,
      "https://image.tmdb.org/t/p/w1280/still.jpg",
    );
    await assert.rejects(() => getTVEpisodes("42", -1));
    assert.equal(paths.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
    else process.env.TMDB_READ_ACCESS_TOKEN = originalToken;
  }
});
