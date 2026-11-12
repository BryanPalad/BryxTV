import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Candidate } from "./types";
const evidence = z.string().trim().min(40).max(700);
export const verificationProofSchema = z
  .object({
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    tmdbId: z.number().int().positive(),
    mediaType: z.enum(["tv", "movie"]),
    season: z.number().int().nonnegative().nullable(),
    episode: z.number().int().positive().nullable(),
    publisherConfirmed: z.literal(true),
    mappingConfirmed: z.literal(true),
    fullContentConfirmed: z.literal(true),
    publisherIdentity: evidence,
    fullContent: evidence,
    embedPermission: evidence,
    philippines: evidence,
    subtitles: z.string().trim().min(20).max(700),
    browserPlayback: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
    seeking: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
    fullscreen: z.enum(["PASS", "FAIL", "NOT_TESTED"]),
    region: z.enum(["UNKNOWN", "AVAILABLE_PH", "RESTRICTED_PH"]),
    embedding: z.enum(["UNKNOWN", "ALLOWED", "BLOCKED"]),
    access: z.enum(["UNKNOWN", "PUBLIC", "MEMBERSHIP", "PAID"]),
    subtitleLanguages: z
      .array(z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/))
      .max(20),
    verifiedAt: z.iso.datetime(),
  })
  .strict();
export type VerificationProof = z.infer<typeof verificationProofSchema>;
export function verifiedProofFor(row: Candidate, input: unknown) {
  const proof = verificationProofSchema.parse(input);
  if (
    row.fixture ||
    row.reviewDecision === "REJECTED" ||
    row.duplicateReasons.length ||
    row.regionVerification === "API_BLOCKED_PH" ||
    (row.embedVerification === "API_BLOCKED" &&
      proof.embedding !== "BLOCKED") ||
    !["FULL_EPISODE", "FULL_MOVIE"].includes(row.classification) ||
    proof.videoId !== row.videoId ||
    proof.tmdbId !== row.match.tmdbId ||
    proof.mediaType !== row.match.mediaType ||
    proof.season !== row.match.season ||
    proof.episode !== row.match.episode ||
    Date.parse(proof.verifiedAt) > Date.now() + 60000
  )
    throw new Error("Independent evidence does not match this candidate.");
  return proof;
}
export function proofAllowsApproval(proof: VerificationProof) {
  return (
    proof.region === "AVAILABLE_PH" &&
    proof.embedding === "ALLOWED" &&
    proof.access === "PUBLIC" &&
    proof.browserPlayback === "PASS" &&
    proof.seeking === "PASS" &&
    proof.fullscreen === "PASS"
  );
}

export function proofAllowsProviderLink(proof: VerificationProof) {
  return (
    proof.region === "AVAILABLE_PH" &&
    proof.embedding === "BLOCKED" &&
    proof.access === "PUBLIC" &&
    proof.browserPlayback === "PASS"
  );
}
export function candidateFingerprint(row: Candidate) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        row.videoId,
        row.channelId,
        row.videoTitle,
        row.description,
        row.durationSeconds,
        row.classification,
        row.match,
        row.regionVerification,
        row.embedVerification,
      ]),
    )
    .digest("hex");
}

import { mappingSchema } from "./types";
export const mappingReviewSchema = z
  .object({
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    catalog: mappingSchema,
    season: z.number().int().nonnegative().nullable(),
    episode: z.number().int().positive().nullable(),
    mappingConfirmed: z.literal(true),
    reason: z.string().trim().min(40).max(1000),
    reviewedAt: z.iso.datetime(),
  })
  .strict();
export function applyReviewedMapping(row: Candidate, input: unknown) {
  const review = mappingReviewSchema.parse(input);
  if (
    review.videoId !== row.videoId ||
    Date.parse(review.reviewedAt) > Date.now() + 60000 ||
    !["FULL_EPISODE", "FULL_MOVIE"].includes(row.classification)
  )
    throw new Error("Mapping review does not identify this individual source.");
  if (
    row.classification === "FULL_EPISODE"
      ? review.catalog.mediaType !== "tv" ||
        !review.catalog.seasons
          .find((s) => s.number === review.season)
          ?.episodes.some((e) => e.number === review.episode)
      : review.catalog.mediaType !== "movie" ||
        review.season !== null ||
        review.episode !== null
  )
    throw new Error("Reviewed episode must exist in supplied TMDB metadata.");
  return {
    ...row,
    match: {
      tmdbId: review.catalog.tmdbId,
      mediaType: review.catalog.mediaType,
      title: review.catalog.title,
      season: review.season,
      episode: review.episode,
      confidence: "HIGH" as const,
      reason: `Independent mapping review: ${review.reason}`,
    },
    mappingReview: { reason: review.reason, reviewedAt: review.reviewedAt },
  };
}
