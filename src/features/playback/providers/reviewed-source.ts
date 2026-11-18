import "server-only";
import { z } from "zod";
import { progressIdentity, progressKey } from "@/features/history/types";
import type { PlaybackTarget } from "@/types/playback";
import { providers } from "./registry";
import { resolvedOptions, type SourceRecord } from "./policy";

const text = z.string().trim().min(1).max(2000);
/** Private review input, never an HTTP request schema or a client approval flag. */
export const reviewedSourceSchema = z.object({
  id: text,
  providerId: z.string().regex(/^[a-z0-9-]+$/),
  providerContentId: text,
  providerEpisodeId: text,
  identity: progressIdentity,
  sourceType: z.enum(["iframe", "direct"]),
  sourceUrl: text,
  label: text,
  approval: z.object({
    status: z.enum(["Approved", "Rejected", "Needs Verification"]),
    evidenceReference: text,
    freeThirdPartyPlayback: z.boolean(),
    philippines: z.boolean(),
  }).strict(),
  playback: z.object({
    status: z.enum(["AVAILABLE", "UNKNOWN", "UNAVAILABLE"]),
    checkedAt: z.iso.datetime().nullable(),
    evidenceReference: text.nullable(),
  }).strict(),
  language: text.optional(),
  subtitles: z.array(text).optional(),
}).strict();
export type ReviewedSource = z.infer<typeof reviewedSourceSchema>;

/**
 * Bridge trusted, manually reviewed manifests to the existing player adapter.
 * No providers are registered here. Evidence strings require human review;
 * this function cannot prove rights or grant authorization to HTTP callers.
 */
export function resolveReviewedSources(records: readonly unknown[], target: PlaybackTarget) {
  const rows: SourceRecord[] = [];
  for (const input of records) {
    const parsed = reviewedSourceSchema.safeParse(input);
    if (!parsed.success) continue;
    const source = parsed.data;
    const provider = providers.get(source.providerId);
    if (!provider || source.identity.mediaType === "demo" ||
      source.approval.status !== "Approved" ||
      !source.approval.freeThirdPartyPlayback || !source.approval.philippines ||
      (provider.type === "EXTERNAL_EMBED") !== (source.sourceType === "iframe")) continue;
    rows.push({
      id: source.id, contentKey: progressKey(source.identity), sourceUrl: source.sourceUrl,
      displayLabel: source.label, priority: 100, enabled: true,
      authorizationVerified: true, authorizationEvidence: source.approval.evidenceReference,
      availabilityStatus: source.playback.status,
      lastCheckedAt: source.playback.checkedAt ? new Date(source.playback.checkedAt) : null,
      verificationEvidence: source.playback.evidenceReference,
      provider: { slug: provider.slug, type: provider.type, enabled: provider.enabled },
    });
  }
  // Reuses exact URL/host, current product eligibility and episode checks.
  // Review evidence, provider asset IDs and optional track metadata stay private.
  return resolvedOptions(rows, target);
}
