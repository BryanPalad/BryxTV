import type { VerificationProof } from "./review";
import { z } from "zod";
export const contentTypes = ["anime", "kdrama", "all"] as const;
export type ContentType = (typeof contentTypes)[number];
export const classifications = [
  "FULL_EPISODE",
  "FULL_MOVIE",
  "SEASON_COMPILATION",
  "TRAILER",
  "CLIP",
  "SHORT",
  "UNKNOWN",
] as const;
export const videoSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  channelId: z.string().regex(/^UC[A-Za-z0-9_-]{22}$/),
  title: z.string().max(1000),
  description: z.string().max(20000),
  durationSeconds: z.number().nonnegative().nullable(),
  publishedAt: z.string(),
  embeddable: z.boolean().nullable(),
  public: z.boolean(),
  allowedRegions: z.array(z.string()).nullable(),
  blockedRegions: z.array(z.string()).nullable(),
  captionFlag: z.boolean().nullable(),
});
export type DiscoveryVideo = z.infer<typeof videoSchema>;
export const mappingSchema = z.object({
  mediaType: z.enum(["tv", "movie"]),
  tmdbId: z.number().int().positive(),
  title: z.string(),
  aliases: z.array(z.string()),
  originalLanguage: z.string(),
  genres: z.array(z.number()),
  popularity: z.number(),
  releaseDate: z.string().nullable(),
  seasons: z.array(
    z.object({
      number: z.number().int().nonnegative(),
      episodes: z.array(
        z.object({
          number: z.number().int().positive(),
          title: z.string(),
          airDate: z.string().nullable(),
        }),
      ),
    }),
  ),
});
export type CatalogMapping = z.infer<typeof mappingSchema>;
export interface Match {
  tmdbId: number | null;
  mediaType: "tv" | "movie" | null;
  title: string | null;
  season: number | null;
  episode: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
}
export interface Verification {
  publisherIdentity: string;
  fullContent: string;
  embedPermission: string;
  philippines: string;
  subtitles: string;
  browserPlayback: string;
  seeking: string;
  fullscreen: string;
  verifiedAt: string | null;
}
export interface Candidate {
  videoId: string;
  publisher: string;
  publisherName: string;
  channelId: string;
  sourceUrl: string;
  videoTitle: string;
  description: string;
  durationSeconds: number | null;
  classification: (typeof classifications)[number];
  classificationEvidence: string[];
  match: Match;
  subtitleAvailability: string;
  regionVerification: "API_BLOCKED_PH" | "UNKNOWN";
  embedVerification: "API_ALLOWED_ONLY" | "API_BLOCKED" | "UNKNOWN";
  approvalStatus: "UNKNOWN";
  enabled: false;
  reviewDecision: "PENDING" | "REJECTED";
  reviewReason: string;
  duplicateReasons: string[];
  verification: Verification;
  mappingReview?: { reason: string; reviewedAt: string };
  manualReview?: VerificationProof;
  manualReviewFingerprint?: string;
  discoveredAt: string;
  lastObservedAt: string;
  fixture: boolean;
}
export interface DiscoveryReport {
  schemaVersion: 1;
  generatedAt: string;
  fixture: boolean;
  dryRun: boolean;
  limit: number;
  examined: number;
  apiRequests: number;
  complete: boolean;
  errors: string[];
  counts: {
    candidatesDiscovered: number;
    candidateFullEpisodes: number;
    highConfidenceMappings: number;
    duplicates: number;
    verifiedPlayableEpisodes: number;
    providerOnlyEpisodes: number;
    unknownCandidates: number;
    pendingReviewCandidates: number;
    rejectedCandidates: number;
    approvedEpisodes: number;
  };
  candidates: Candidate[];
  opportunities: SeasonOpportunity[];
}
export interface SeasonOpportunity {
  tmdbId: number;
  title: string;
  season: number;
  expectedEpisodes: number;
  candidateEpisodes: number;
  longestCandidateRun: number;
  candidateCompleteSeason: boolean;
  verifiedEpisodes: number;
  longestVerifiedRun: number;
  verifiedCompleteSeason: boolean;
  score: number;
}
