import {
  verifiedProofFor,
  proofAllowsApproval,
  proofAllowsProviderLink,
  candidateFingerprint,
  applyReviewedMapping,
} from "../src/features/playback/discovery/review";
import { detectDuplicates } from "../src/features/playback/discovery/pipeline";
import { parseArgs } from "node:util";
import { resolve, relative } from "node:path";
import { readFile } from "node:fs/promises";
import {
  officialSourceSchema,
  officialManifestSchema,
  officialProviders,
} from "../src/features/playback/providers/official-policy";
import {
  readJSON,
  atomicJSON,
  type CandidateStore,
} from "../src/features/playback/discovery/storage";
async function main() {
  if (process.env.NODE_ENV === "production") throw new Error();
  const { values } = parseArgs({
    options: {
      fixture: { type: "boolean", default: false },
      "state-dir": { type: "string" },
      video: { type: "string" },
      reject: { type: "string" },
      verification: { type: "string" },
      mapping: { type: "string" },
      "prepare-approval": { type: "boolean", default: false },
      "prepare-provider-link": { type: "boolean", default: false },
      "export-review": { type: "string" },
    },
    strict: true,
  });
  const stateBase = resolve(values["state-dir"] ?? ".bryxtv/discovery");
  if (relative(resolve(".bryxtv/discovery"), stateBase).startsWith(".."))
    throw new Error();
  const path = resolve(
      stateBase,
      values.fixture ? "fixtures" : "live",
      "candidates.json",
    ),
    store = await readJSON<CandidateStore>(path, {
      schemaVersion: 1,
      fixture: values.fixture === true,
      candidates: [],
    });
  if (
    store.schemaVersion !== 1 ||
    store.fixture !== (values.fixture === true) ||
    !Array.isArray(store.candidates)
  )
    throw new Error();
  if (values.video && !/^[A-Za-z0-9_-]{11}$/.test(values.video))
    throw new Error();
  const rows = store.candidates.filter(
    (row) => !values.video || row.videoId === values.video,
  );
  if (values.mapping) {
    if (!values.video || rows.length !== 1) throw new Error();
    const mapped = applyReviewedMapping(
      rows[0]!,
      JSON.parse(await readFile(resolve(values.mapping), "utf8")),
    );
    const manifest = officialManifestSchema.parse(
      JSON.parse(
        await readFile(
          resolve("src/features/playback/data/official-sources.json"),
          "utf8",
        ),
      ),
    );
    const other = store.candidates
      .filter(
        (row) => row.videoId !== mapped.videoId && row.match.tmdbId !== null,
      )
      .map((row) => ({
        videoId: row.videoId,
        mediaType: row.match.mediaType!,
        tmdbId: row.match.tmdbId!,
        season: row.match.season,
        episode: row.match.episode,
      }));
    const checked = detectDuplicates([mapped], [...manifest, ...other])[0]!;
    if (checked.duplicateReasons.length) throw new Error();
    store.candidates = store.candidates.map((row) =>
      row.videoId === checked.videoId ? checked : row,
    );
    await atomicJSON(path, store);
    console.log(
      "Explicit TMDB mapping review saved. Candidate remains UNKNOWN and disabled.",
    );
    return;
  }
  if (values.verification) {
    if (!values.video || rows.length !== 1) throw new Error();
    const row = rows[0]!,
      proof = verifiedProofFor(
        row,
        JSON.parse(await readFile(resolve(values.verification), "utf8")),
      );
    row.manualReview = proof;
    row.manualReviewFingerprint = candidateFingerprint(row);
    row.verification = {
      publisherIdentity: proof.publisherIdentity,
      fullContent: proof.fullContent,
      embedPermission: proof.embedPermission,
      philippines: proof.philippines,
      subtitles: proof.subtitles,
      browserPlayback: proof.browserPlayback,
      seeking: proof.seeking,
      fullscreen: proof.fullscreen,
      verifiedAt: proof.verifiedAt,
    };
    await atomicJSON(path, store);
    console.log(
      "Independent per-video verification saved locally. Source remains UNKNOWN and disabled until existing approval tooling is explicitly used.",
    );
    return;
  }
  if (
    (values["prepare-approval"] || values["prepare-provider-link"]) &&
    !values["export-review"]
  )
    throw new Error();
  if (values.reject) {
    if (!values.video || rows.length !== 1 || values.reject.trim().length < 20)
      throw new Error();
    rows[0]!.reviewDecision = "REJECTED";
    rows[0]!.reviewReason = values.reject.trim();
    await atomicJSON(path, store);
    console.log(
      "Candidate rejected locally; existing playback records unchanged.",
    );
    return;
  }
  if (values["export-review"]) {
    const row = rows[0];
    if (
      !values.video ||
      rows.length !== 1 ||
      !row ||
      row.fixture ||
      store.fixture ||
      row.reviewDecision !== "PENDING" ||
      row.duplicateReasons.length ||
      row.match.tmdbId === null ||
      row.match.mediaType === null ||
      !["FULL_EPISODE", "FULL_MOVIE"].includes(row.classification)
    )
      throw new Error();
    if (
      row.match.mediaType === "tv" &&
      (row.match.season === null || row.match.episode === null)
    )
      throw new Error();
    const provider = row.publisher as keyof typeof officialProviders;
    if (!Object.hasOwn(officialProviders, provider)) throw new Error();
    if (values["prepare-approval"] && values["prepare-provider-link"])
      throw new Error();
    const proof =
      values["prepare-approval"] || values["prepare-provider-link"]
        ? verifiedProofFor(row, row.manualReview)
        : null;
    if (
      proof &&
      (row.manualReviewFingerprint !== candidateFingerprint(row) ||
        (values["prepare-provider-link"]
          ? !proofAllowsProviderLink(proof)
          : !proofAllowsApproval(proof)))
    )
      throw new Error();
    const review = officialSourceSchema.parse({
      key: `discovered-${Buffer.from(row.videoId).toString("hex")}`,
      provider,
      uploaderUrl: officialProviders[provider].channelUrl,
      videoId: row.videoId,
      mediaType: row.match.mediaType,
      tmdbId: row.match.tmdbId,
      format: row.classification === "FULL_EPISODE" ? "EPISODE" : "MOVIE",
      season: row.match.season,
      episode: row.match.episode,
      title: row.match.title,
      audioLanguage: null,
      subtitles: proof?.subtitleLanguages ?? [],
      durationSeconds: row.durationSeconds,
      region: proof?.region ?? "UNKNOWN",
      embedding: proof?.embedding ?? "UNKNOWN",
      access: proof?.access ?? "UNKNOWN",
      status: proof
        ? values["prepare-provider-link"]
          ? "WATCH_ON_PROVIDER"
          : "WATCH_ON_BRYXTV"
        : "UNKNOWN",
      enabled: true,
      uploaderVerified: true,
      mappingVerified: proof ? true : row.match.confidence === "HIGH",
      reviewedAt: proof?.verifiedAt ?? new Date().toISOString(),
      evidence: proof
        ? Object.entries(proof)
            .map(
              ([key, value]) =>
                `${key}: ${Array.isArray(value) ? value.join(", ") : value}`,
            )
            .join("\n")
        : `Discovery-only draft: ${row.sourceUrl}. ${row.classificationEvidence.join(" ")} ${row.match.reason} Publisher reference: ${row.verification.publisherIdentity}. No playback, seeking, fullscreen, subtitles or Philippines approval recorded.`,
    });
    // Export cannot silently create a second manifest assignment for an existing episode.
    const existing = officialManifestSchema.parse(
      JSON.parse(
        await readFile(
          resolve("src/features/playback/data/official-sources.json"),
          "utf8",
        ),
      ),
    );
    officialManifestSchema.parse([...existing, review]);
    const output = resolve(values["export-review"]),
      rel = relative(process.cwd(), output);
    if (
      rel.startsWith("..") ||
      rel.split(/[\\/]/).includes("public") ||
      !output.endsWith(".json") ||
      !rel.startsWith(`reports${process.platform === "win32" ? "\\" : "/"}`)
    )
      throw new Error();
    await atomicJSON(output, review);
    console.log(
      "Review draft exported for explicit playback:manage approval. No database source created, enabled or approved.",
    );
    return;
  }
  console.log(
    JSON.stringify(
      {
        fixture: store.fixture,
        count: rows.length,
        candidates: rows.map((row) => ({
          videoId: row.videoId,
          publisher: row.publisher,
          title: row.match.title ?? row.videoTitle,
          match: row.match,
          classification: row.classification,
          decision: row.reviewDecision,
          status: row.approvalStatus,
          enabled: row.enabled,
          duplicates: row.duplicateReasons,
          verification: row.verification,
          manualReview: row.manualReview,
          reason: row.reviewReason,
        })),
      },
      null,
      2,
    ),
  );
}
main().catch(() => {
  console.error(
    "Candidate review failed. Require a valid development candidate and explicit review action. Fixtures, duplicates, ambiguous mappings and unsupported approval flags cannot be exported for playback; existing data retained.",
  );
  process.exitCode = 1;
});
