import { providerEligible } from "../src/features/playback/providers/eligibility";
import nextEnv from "@next/env";
import { parseArgs } from "node:util";
import { resolve, join, relative } from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { YouTubeDiscoveryAPI } from "../src/features/playback/discovery/youtube";
import { discoveryPublishers } from "../src/features/playback/discovery/publishers";
import {
  contentTypes,
  mappingSchema,
  videoSchema,
  type CatalogMapping,
} from "../src/features/playback/discovery/types";
import {
  candidateFromVideo,
  createReport,
  detectDuplicates,
  discoverVideos,
  mergeCandidates,
} from "../src/features/playback/discovery/pipeline";
import {
  DiskAPICache,
  atomicJSON,
  readJSON,
  saveReport,
  type CandidateStore,
} from "../src/features/playback/discovery/storage";
import { loadDiscoveryCatalog } from "../src/features/playback/discovery/catalog";
import { fixtureTransport } from "./discovery-fixture";
import { officialManifestSchema } from "../src/features/playback/providers/official-policy";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Development discovery only.");
  const { values } = parseArgs({
    options: {
      type: { type: "string", default: "all" },
      series: { type: "string" },
      publisher: { type: "string" },
      playlist: { type: "string" },
      limit: { type: "string", default: "100" },
      "dry-run": { type: "boolean", default: false },
      out: { type: "string" },
      catalog: { type: "string" },
      fixture: { type: "boolean", default: false },
      "state-dir": { type: "string" },
      "request-budget": { type: "string", default: "100" },
    },
    strict: true,
  });
  const fixture = values.fixture === true;
  if (!fixture && !providerEligible("youtube-privacy")) throw new Error("YouTube discovery is inactive under the current provider policy.");
  const type = z.enum(contentTypes).parse(values.type),
    limit = z.coerce.number().int().min(1).max(1000).parse(values.limit),
    budget = z.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .parse(values["request-budget"]);
  if (values.series && normalizeSeries(values.series).length < 2)
    throw new Error("Series filter must contain at least two letters/numbers.");
  let publishers = discoveryPublishers.filter(
    (p) =>
      (type === "all" || p.type === type) &&
      (!values.publisher || p.slug === values.publisher),
  );
  if (!publishers.length)
    throw new Error(
      "No pinned publisher matches. Additional identities require code review.",
    );
  if (
    values.playlist &&
    (!values.publisher || !/^[A-Za-z0-9_-]{10,150}$/.test(values.playlist))
  )
    throw new Error(
      "A valid playlist ID and pinned --publisher are required together.",
    );
  if (!fixture && !process.env.YOUTUBE_API_KEY?.trim())
    throw new Error(
      "YOUTUBE_API_KEY is missing. Enable the free YouTube Data API v3 and add a server-only key to .env.local, or run explicitly with --fixture. No live candidates discovered.",
    );
  const directory = resolve(
    values.out ??
      join("reports/discovery", fixture ? "fixtures" : "live", type),
  );
  const rel = relative(process.cwd(), directory);
  if (rel.startsWith("..") || rel.split(/[\\/]/).includes("public"))
    throw new Error(
      "Report output must be a non-public directory inside the repository.",
    );
  const stateBase = resolve(values["state-dir"] ?? ".bryxtv/discovery");
  if (relative(resolve(".bryxtv/discovery"), stateBase).startsWith(".."))
    throw new Error(
      "Candidate state must remain in the private discovery workspace.",
    );
  const root = resolve(stateBase, fixture ? "fixtures" : "live"),
    cache = new DiskAPICache(join(root, "cache"));
  if (!values["dry-run"]) await cache.prune();
  let fetcher: typeof fetch | undefined,
    fixtureCatalog: CatalogMapping[] = [];
  if (fixture) {
    const data = z
      .object({ catalog: z.array(mappingSchema), videos: z.array(videoSchema) })
      .parse(
        JSON.parse(
          await readFile(
            resolve("tests/fixtures/discovery/sample.json"),
            "utf8",
          ),
        ),
      );
    fixtureCatalog = data.catalog;
    fetcher = fixtureTransport(data.videos, publishers);
    publishers = publishers.filter((p) =>
      data.videos.some((v) => v.channelId === p.channelId),
    );
  }
  const api = new YouTubeDiscoveryAPI({
    key: fixture ? "fixture-only" : process.env.YOUTUBE_API_KEY,
    ...(fetcher ? { fetcher } : {}),
    ...(values["dry-run"] ? {} : { cache }),
    budget,
  });
  const result = await discoverVideos(api, publishers, {
    limit,
    ...(values.series ? { series: values.series } : {}),
    ...(values.playlist ? { playlist: values.playlist } : {}),
  });
  let catalog: CatalogMapping[] = fixtureCatalog;
  const errors = [...result.errors];
  try {
    if (values.catalog)
      catalog = z
        .array(mappingSchema)
        .parse(JSON.parse(await readFile(resolve(values.catalog), "utf8")));
    else if (!fixture)
      catalog = await loadDiscoveryCatalog(
        result.videos.map((v) => v.video),
        values.series,
      );
  } catch {
    errors.push(
      "TMDB/catalog enrichment unavailable; retain low-confidence unmatched candidates.",
    );
  }
  let rows = result.videos.map(({ video, publisher }) =>
    candidateFromVideo(video, publisher, catalog, fixture),
  );
  if (values.series)
    rows = rows.filter((row) =>
      normalizeSeries(row.videoTitle).includes(normalizeSeries(values.series!)),
    );
  const statePath = join(root, "candidates.json"),
    store = await readJSON<CandidateStore>(statePath, {
      schemaVersion: 1,
      fixture,
      candidates: [],
    });
  if (
    store.schemaVersion !== 1 ||
    store.fixture !== fixture ||
    !Array.isArray(store.candidates)
  )
    throw new Error("Candidate state invalid; refusing to replace it.");
  const refreshed = mergeCandidates(store.candidates, rows);
  rows = rows.map((row) =>
    refreshed.find((item) => item.videoId === row.videoId)!,
  );
  const existing = officialManifestSchema.parse(
    JSON.parse(
      await readFile(
        resolve("src/features/playback/data/official-sources.json"),
        "utf8",
      ),
    ),
  );
  const staged = store.candidates
    .filter(
      (row) =>
        !rows.some((next) => next.videoId === row.videoId) &&
        row.match.tmdbId !== null,
    )
    .map((row) => ({
      videoId: row.videoId,
      mediaType: row.match.mediaType!,
      tmdbId: row.match.tmdbId!,
      season: row.match.season,
      episode: row.match.episode,
    }));
  rows = detectDuplicates(rows, [...existing, ...staged]);
  if (!values["dry-run"])
    await atomicJSON(statePath, {
      schemaVersion: 1,
      fixture,
      candidates: mergeCandidates(store.candidates, rows),
    });
  const report = createReport(rows, catalog, {
    fixture,
    dryRun: values["dry-run"],
    limit,
    examined: result.examined,
    apiRequests: api.requests,
    errors,
    repeatedListings: result.repeatedListings,
  });
  await saveReport(directory, report);
  console.log(
    JSON.stringify(
      {
        fixture: report.fixture,
        dryRun: report.dryRun,
        examined: report.examined,
        counts: report.counts,
        apiRequests: report.apiRequests,
        complete: report.complete,
        errors: report.errors,
        reports: [
          join(directory, "discovery.json"),
          join(directory, "discovery.csv"),
        ],
        warning:
          "Discovery never approves playback. Fixture results are not real content.",
      },
      null,
      2,
    ),
  );
  if (errors.length) process.exitCode = 1;
}
function normalizeSeries(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
main().catch((error) => {
  console.error(
    error instanceof Error &&
      /YouTube discovery is inactive|YOUTUBE_API_KEY is missing|Development discovery only|No pinned publisher|playlist ID|Series filter|Report output|Candidate state/.test(
        error.message,
      )
      ? error.message
      : "Discovery failed; no playback source was approved. Check CLI input, local state, credentials or provider quota. Raw errors withheld.",
  );
  process.exitCode = 1;
});
