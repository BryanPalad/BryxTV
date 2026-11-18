import { progressKey, sourceIdentity } from "@/features/history/types";
import { providers, providerAllowsURL } from "./registry";
import type { PlaybackOption } from "./types";
import type { PlaybackSource, PlaybackTarget } from "@/types/playback";
export interface SourceRecord {
  id: string; contentKey: string; sourceUrl: string; displayLabel: string; priority: number; enabled: boolean;
  authorizationVerified: boolean; authorizationEvidence: string | null; availabilityStatus: string;
  verificationEvidence: string | null; lastCheckedAt: Date | null;
  provider: { slug: string; type: string; enabled: boolean };
}
export function approvedPolicy(row: SourceRecord) {
  const provider = providers.get(row.provider.slug);
  return provider && provider.enabled && row.provider.enabled && row.enabled && provider.type === row.provider.type && row.authorizationVerified && !!row.authorizationEvidence?.trim() && providerAllowsURL(provider, row.sourceUrl) ? provider : null;
}
function optionFor(row: SourceRecord, target: PlaybackTarget, preview: boolean): PlaybackOption | null {
  const identity = sourceIdentity(target);
  if (!identity || row.contentKey !== progressKey(identity)) return null;
  const provider = approvedPolicy(preview ? { ...row, enabled: true } : row);
  if (!provider || preview && provider.type !== "EXTERNAL_EMBED") return null;
  if (!preview && (row.availabilityStatus !== "AVAILABLE" || !row.lastCheckedAt || !row.verificationEvidence?.trim())) return null;
  const video: PlaybackSource | null = provider.type === "EXTERNAL_EMBED" ? null : {
    ...target, id: row.id, sourceUrl: row.sourceUrl, sourceType: provider.type === "VIDEOJS_MP4" ? "mp4" : "hls", title: row.displayLabel, description: "Authorized playback source.", authorized: true,
    attribution: { creator: "", provider: provider.name, source: "", license: "Rights reviewed", licenseUrl: "", changes: "" },
  };
  return { id: row.id, provider: provider.name, label: row.displayLabel, type: provider.type, sourceUrl: row.sourceUrl, progressTracking: provider.progressTracking, fullscreen: provider.fullscreen, video, ...(preview ? { preview: true } : {}) };
}
export function resolvedOptions(rows: SourceRecord[], target: PlaybackTarget): PlaybackOption[] {
  return [...rows].sort((a,b) => a.priority-b.priority || a.id.localeCompare(b.id)).flatMap(row => { const option = optionFor(row,target,false); return option ? [option] : []; });
}
/** Server must enforce the development/session/host gate before calling this. */
export function developmentPreviewOption(row: SourceRecord, target: PlaybackTarget) { return optionFor(row,target,true); }
export function previewAllowed(environment: string | undefined, host: string, authenticated: boolean) {
  return environment === "development" && authenticated && /^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/.test(host);
}
