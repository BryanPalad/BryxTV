import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  YouTubeDiscoveryAPI,
  DiscoveryAPIError,
  isoDuration,
} from "../src/features/playback/discovery/youtube";
import {
  videoSchema,
  mappingSchema,
} from "../src/features/playback/discovery/types";
import { classifyVideo } from "../src/features/playback/discovery/classification";
import { matchVideo } from "../src/features/playback/discovery/matching";
import {
  candidateFromVideo,
  createReport,
  detectDuplicates,
  discoverVideos,
  mergeCandidates,
} from "../src/features/playback/discovery/pipeline";
import {
  completeSeason,
  longestRun,
  compareApprovedSeries,
} from "../src/features/playback/discovery/ranking";
import { discoveryPublishers } from "../src/features/playback/discovery/publishers";
import { fixtureTransport } from "../scripts/discovery-fixture";
import {
  DiskAPICache,
  atomicJSON,
  readJSON,
  reportCSV,
} from "../src/features/playback/discovery/storage";
const fixture = JSON.parse(
  await readFile(
    new URL("./fixtures/discovery/sample.json", import.meta.url),
    "utf8",
  ),
);
const videos = videoSchema.array().parse(fixture.videos),
  catalog = mappingSchema.array().parse(fixture.catalog);
const publisher = discoveryPublishers.find(
    (p) => p.slug === "muse-philippines",
  )!,
  video = videos[0]!;
const api = () =>
  new YouTubeDiscoveryAPI({
    key: "test-secret",
    fetcher: fixtureTransport(videos, discoveryPublishers),
  });
test("API follows channel playlists and playlist pagination, batches metadata and enforces candidate limit", async () => {
  const client = api(),
    result = await discoverVideos(client, [publisher], { limit: 5 });
  assert.equal(result.examined, 5);
  assert.equal(result.videos.length, 5);
  assert.deepEqual(result.errors, []);
  assert.ok(client.requests < 10);
  const more = await discoverVideos(api(), [publisher], { limit: 100 });
  assert.equal(more.videos.length, 10);
  assert.equal(more.repeatedListings, 10);
});
test("API batches at most 50 IDs, deduplicates requested IDs and never puts the key in URLs", async () => {
  let calls = 0;
  const ids = Array.from(
    { length: 101 },
    (_, i) => `testVid${String(i).padStart(4, "0")}`,
  );
  const client = new YouTubeDiscoveryAPI({
    key: "private-key",
    fetcher: async (input, init) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.searchParams.has("key"), false);
      assert.equal(
        (init!.headers as Record<string, string>)["X-Goog-Api-Key"],
        "private-key",
      );
      assert.ok(url.searchParams.get("id")!.split(",").length <= 50);
      return Response.json({ items: [] });
    },
  });
  await client.videos([...ids, ids[0]!]);
  assert.equal(calls, 3);
});
test("quota, rate limits, request budget and missing credentials stop without retries or raw provider errors", async () => {
  for (const [status, reason, code] of [
    [403, "quotaExceeded", "QUOTA"],
    [429, "sensitive-provider-body", "RATE_LIMIT"],
    [403, "private secret", "API_ERROR"],
  ] as const) {
    let calls = 0;
    const client = new YouTubeDiscoveryAPI({
      key: "secret",
      fetcher: async () => {
        calls++;
        return Response.json(
          { error: { errors: [{ reason }], message: "secret-token" } },
          { status },
        );
      },
    });
    await assert.rejects(
      () => client.videos([video.id]),
      (error) =>
        error instanceof DiscoveryAPIError &&
        error.code === code &&
        !error.message.includes("secret"),
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    () =>
      new YouTubeDiscoveryAPI({ key: undefined }).uploads(publisher.channelId),
    /MISSING_KEY/,
  );
  await assert.rejects(
    () =>
      new YouTubeDiscoveryAPI({ key: "x", budget: 0 }).uploads(
        publisher.channelId,
      ),
    /BUDGET/,
  );
});
test("repeated pagination tokens and malformed responses fail safely", async () => {
  const client = new YouTubeDiscoveryAPI({
    key: "x",
    fetcher: async () =>
      Response.json({
        items: [{ contentDetails: { videoId: video.id } }],
        nextPageToken: "repeat",
      }),
  });
  await assert.rejects(async () => {
    for await (const id of client.playlistVideoIds("PLfixture123456")) void id;
  }, /PAGINATION/);
  const bad = new YouTubeDiscoveryAPI({
    key: "x",
    fetcher: async () => Response.json({ items: "bad" }),
  });
  await assert.rejects(() => bad.videos([video.id]), /INVALID_RESPONSE/);
});
test("publisher handle checks reject channel ID drift and playlist ownership is independently checked", async () => {
  const result = await discoverVideos(api(), [publisher], {
    limit: 10,
    playlist: "PLunowned12345",
  });
  assert.equal(result.videos.length, 0);
  assert.ok(result.errors.length);
  await assert.rejects(
    () => api().uploads(publisher.channelId, "@Imposter"),
    /INVALID_RESPONSE/,
  );
});
test("cache expires within a day, prunes stale data, and cache keys contain no API credentials", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bryxtv-cache-"));
  let now = 0;
  try {
    const cache = new DiskAPICache(dir, () => now);
    await cache.set("public-request", { items: [] });
    assert.deepEqual(await cache.get("public-request"), { items: [] });
    now = 86400001;
    assert.equal(await cache.get("public-request"), undefined);
    let calls = 0;
    const memory = new Map<string, unknown>();
    const client = new YouTubeDiscoveryAPI({
      key: "private",
      cache: {
        get: async (key) => memory.get(key),
        set: async (key, value) => {
          assert.equal(key.includes("private"), false);
          memory.set(key, value);
        },
      },
      fetcher: async () => {
        calls++;
        return Response.json({ items: [] });
      },
    });
    await client.videos([video.id]);
    await client.videos([video.id]);
    assert.equal(calls, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("classification uses explicit content markers and excludes trailers, clips and shorts", () => {
  assert.equal(classifyVideo(video).kind, "FULL_EPISODE");
  for (const [title, duration, kind] of [
    ["Fixture Anime Official Trailer Episode 1", 1500, "TRAILER"],
    ["Fixture Anime Highlights Ep1", 1400, "CLIP"],
    ["Fixture Anime #shorts", 1200, "SHORT"],
    ["Fixture Anime Full Season Episode 1-12", 18000, "SEASON_COMPILATION"],
    ["Fixture Anime Full Movie", 5400, "FULL_MOVIE"],
    ["Fixture Anime", 1440, "UNKNOWN"],
  ] as const)
    assert.equal(
      classifyVideo({ ...video, title, durationSeconds: duration }).kind,
      kind,
    );
  assert.equal(isoDuration("PT1H2M3S"), 3723);
  assert.equal(isoDuration("P1DT1S"), 86401);
  assert.equal(isoDuration("garbage"), null);
});
test("matching requires exact aliases and explicit numbering, checks episode names, and never infers absolute anime seasons", () => {
  assert.equal(matchVideo(video, catalog, "FULL_EPISODE").confidence, "HIGH");
  const absolute = matchVideo(
    { ...video, title: "Fixture Anime Episode 25" },
    catalog,
    "FULL_EPISODE",
  );
  assert.equal(absolute.confidence, "MEDIUM");
  assert.equal(absolute.season, null);
  assert.equal(absolute.episode, null);
  const bad = matchVideo(
    { ...video, title: "Fixture Anime S2E01" },
    catalog,
    "FULL_EPISODE",
  );
  assert.equal(bad.confidence, "LOW");
  assert.equal(bad.episode, null);
  assert.equal(
    matchVideo(
      video,
      [...catalog, { ...catalog[0]!, tmdbId: 99 }],
      "FULL_EPISODE",
    ).tmdbId,
    null,
  );
  assert.equal(matchVideo(video, catalog, "SEASON_COMPILATION").episode, null);
  assert.equal(
    matchVideo({ ...video, title: "Other Show S1E01" }, catalog, "FULL_EPISODE")
      .tmdbId,
    null,
  );
  const alias = { ...catalog[0]!, aliases: ["Alternate Fixture"] };
  assert.equal(
    matchVideo(
      { ...video, title: "Alternate Fixture S1E01 Test Story 1" },
      [alias],
      "FULL_EPISODE",
    ).confidence,
    "HIGH",
  );
});
test("API embed, region and subtitle flags never enable or approve a discovered candidate", () => {
  const row = candidateFromVideo(
    { ...video, allowedRegions: ["PH"] },
    publisher,
    catalog,
    true,
  );
  assert.equal(row.enabled, false);
  assert.equal(row.approvalStatus, "UNKNOWN");
  assert.equal(row.regionVerification, "UNKNOWN");
  assert.equal(row.embedVerification, "API_ALLOWED_ONLY");
  assert.equal(row.subtitleAvailability, "PUBLISHER_CLAIM_EN");
  assert.equal(row.verification.verifiedAt, null);
  assert.equal(
    candidateFromVideo({ ...video, blockedRegions: ["PH"] }, publisher, catalog)
      .reviewDecision,
    "REJECTED",
  );
  assert.equal(
    candidateFromVideo(
      { ...video, channelId: "UC0000000000000000000000" },
      publisher,
      catalog,
    ).reviewDecision,
    "REJECTED",
  );
  assert.equal(
    candidateFromVideo({ ...video, embeddable: false }, publisher, catalog)
      .reviewDecision,
    "PENDING",
  );
  const caption = candidateFromVideo(
    {
      ...video,
      title: "Fixture Anime S1E01",
      description: "",
      captionFlag: true,
    },
    publisher,
    catalog,
  );
  assert.equal(caption.subtitleAvailability, "CAPTIONS_LANGUAGE_UNKNOWN");
});
test("duplicate IDs and conflicting episode assignments are flagged, and idempotent staging preserves rejections/evidence", () => {
  const row = candidateFromVideo(
    video,
    publisher,
    catalog,
    true,
    "2026-01-01T00:00:00Z",
  );
  const duplicates = detectDuplicates([
    row,
    { ...row, videoId: "abcdefghijk" },
  ]);
  assert.equal(duplicates[1]!.duplicateReasons.length, 1);
  const merged = mergeCandidates(
    [
      {
        ...row,
        reviewDecision: "REJECTED",
        reviewReason: "Independent reviewer rejected incomplete upload.",
      },
    ],
    [{ ...row, lastObservedAt: "2026-02-01T00:00:00Z" }],
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.reviewDecision, "REJECTED");
  assert.equal(merged[0]!.discoveredAt, row.discoveredAt);
  assert.equal(
    detectDuplicates(
      [row],
      [
        {
          videoId: row.videoId,
          tmdbId: 200000001,
          mediaType: "tv",
          season: 1,
          episode: 1,
        },
      ],
    )[0]!.duplicateReasons.length,
    1,
  );
});
test("complete-season opportunities remain candidate-only and approved ranking counts consecutive playable episodes only", () => {
  const rows = videos
    .slice(0, 4)
    .map((video) => candidateFromVideo(video, publisher, catalog, true));
  const report = createReport(rows, catalog, {
    fixture: true,
    dryRun: true,
    limit: 100,
    examined: 4,
    apiRequests: 0,
    errors: [],
  });
  assert.equal(report.opportunities[0]!.candidateCompleteSeason, true);
  assert.equal(report.opportunities[0]!.longestCandidateRun, 4);
  assert.equal(report.counts.verifiedPlayableEpisodes, 0);
  assert.equal(report.counts.approvedEpisodes, 0);
  assert.equal(report.opportunities[0]!.verifiedCompleteSeason, false);
  assert.equal(longestRun([1, 2, 2, 4, 5, 6]), 3);
  assert.equal(completeSeason([1, 3], 3), false);
  assert.equal(completeSeason([1, 2, 3], 3), true);
  assert.ok(
    compareApprovedSeries(
      {
        id: 1,
        completeSeasons: 0,
        longestConsecutive: 8,
        verifiedEpisodes: 8,
        popularity: 5,
      },
      {
        id: 2,
        completeSeasons: 0,
        longestConsecutive: 1,
        verifiedEpisodes: 1,
        popularity: 5,
      },
    ) < 0,
  );
});
test("reports escape CSV formulas and local atomic staging preserves existing records", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bryxtv-stage-"));
  try {
    const row = candidateFromVideo(
        { ...video, title: '=HYPERLINK("evil")' },
        publisher,
        [],
        true,
      ),
      report = createReport([row], [], {
        fixture: true,
        dryRun: false,
        limit: 1,
        examined: 1,
        apiRequests: 0,
        errors: [],
      });
    assert.ok(reportCSV(report).includes("'=HYPERLINK"));
    const path = join(dir, "candidates.json");
    await atomicJSON(path, { candidates: [row] });
    assert.equal(
      (await readJSON<{ candidates: unknown[] }>(path, { candidates: [] }))
        .candidates.length,
      1,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("approval preparation requires independent matching per-video evidence; fixtures, incomplete checks and restrictions cannot pass", async () => {
  const {
    verifiedProofFor,
    proofAllowsApproval,
    proofAllowsProviderLink,
    candidateFingerprint,
  } = await import("../src/features/playback/discovery/review");
  const row = candidateFromVideo(video, publisher, catalog, false);
  const proof = {
    videoId: row.videoId,
    tmdbId: row.match.tmdbId,
    mediaType: row.match.mediaType,
    season: row.match.season,
    episode: row.match.episode,
    publisherConfirmed: true,
    mappingConfirmed: true,
    fullContentConfirmed: true,
    publisherIdentity:
      "Independent test evidence describing the exact official publisher identity.",
    fullContent:
      "Independent test evidence describing the complete episode and exact runtime.",
    embedPermission:
      "Independent test evidence describing permitted third-party embed behavior.",
    philippines:
      "Independent test evidence describing title-specific Philippines availability.",
    subtitles: "No verified subtitle languages; do not assume English.",
    browserPlayback: "PASS",
    seeking: "PASS",
    fullscreen: "PASS",
    region: "AVAILABLE_PH",
    embedding: "ALLOWED",
    access: "PUBLIC",
    subtitleLanguages: [],
    verifiedAt: new Date().toISOString(),
  };
  assert.equal(proofAllowsApproval(verifiedProofFor(row, proof)), true);
  for (const patch of [
    { videoId: "abcdefghijk" },
    { tmdbId: 99 },
    { season: 2 },
    { publisherConfirmed: false },
    { philippines: "short" },
  ])
    assert.throws(() => verifiedProofFor(row, { ...proof, ...patch }));
  assert.throws(() => verifiedProofFor({ ...row, fixture: true }, proof));
  assert.throws(() =>
    verifiedProofFor({ ...row, regionVerification: "API_BLOCKED_PH" }, proof),
  );
  assert.equal(
    proofAllowsApproval(
      verifiedProofFor(row, { ...proof, seeking: "NOT_TESTED" }),
    ),
    false,
  );
  const blocked = { ...row, embedVerification: "API_BLOCKED" as const };
  const external = verifiedProofFor(blocked, {
    ...proof,
    embedding: "BLOCKED",
  });
  assert.equal(proofAllowsApproval(external), false);
  assert.equal(proofAllowsProviderLink(external), true);
  assert.notEqual(
    candidateFingerprint(row),
    candidateFingerprint({
      ...row,
      description: "Changed provider metadata needs review.",
    }),
  );
});

test("manual review resolves ambiguous absolute numbering only against explicit episode metadata and survives unchanged refreshes", async () => {
  const { applyReviewedMapping } =
    await import("../src/features/playback/discovery/review");
  const row = candidateFromVideo(
    { ...video, title: "Fixture Anime Episode 25" },
    publisher,
    catalog,
    false,
  );
  assert.equal(row.match.episode, null);
  const input = {
    videoId: row.videoId,
    catalog: catalog[0],
    season: 1,
    episode: 1,
    mappingConfirmed: true,
    reason:
      "Independent reviewer checked the provider episode against the exact TMDB episode name, release and narrative.",
    reviewedAt: new Date().toISOString(),
  };
  const mapped = applyReviewedMapping(row, input);
  assert.equal(mapped.match.episode, 1);
  assert.equal(mapped.approvalStatus, "UNKNOWN");
  assert.equal(mapped.enabled, false);
  assert.throws(() => applyReviewedMapping(row, { ...input, episode: 99 }));
  assert.equal(mergeCandidates([mapped], [row])[0]!.match.episode, 1);
  assert.equal(
    mergeCandidates(
      [mapped],
      [{ ...row, description: "Provider metadata changed." }],
    )[0]!.match.episode,
    null,
  );
});
