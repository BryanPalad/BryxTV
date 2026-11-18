import { officialProviders } from "../providers/official-policy";
import { classifyVideo } from "./classification";
import { matchVideo, normalizeTitle } from "./matching";
import { seasonOpportunities } from "./ranking";
import type { DiscoveryPublisher } from "./publishers";
import type { YouTubeDiscoveryAPI } from "./youtube";
import type {
  Candidate,
  CatalogMapping,
  DiscoveryReport,
  DiscoveryVideo,
} from "./types";
export function candidateFromVideo(
  video: DiscoveryVideo,
  publisher: DiscoveryPublisher,
  catalog: CatalogMapping[],
  fixture = false,
  now = new Date().toISOString(),
): Candidate {
  const classified = classifyVideo(video),
    match = matchVideo(video, catalog, classified.kind);
  const blocked =
    video.blockedRegions?.includes("PH") ||
    (video.allowedRegions !== null && !video.allowedRegions.includes("PH"));
  const reasons: string[] = [];
  if (video.channelId !== publisher.channelId)
    reasons.push(
      "Uploader channel ID does not match the pinned official publisher.",
    );
  if (
    /\b(?:members?[\s-]*only|ULTRA[\s:-]*(?:exclusive|only)|membership[\s-]*only|pay[\s-]*per[\s-]*view)\b/i.test(
      video.title,
    )
  )
    reasons.push(
      "Publisher title explicitly describes paid or membership-only access; excluded from free discovery.",
    );
  if (!video.public)
    reasons.push(
      "Video is not a public listing; payment or membership cannot be bypassed.",
    );
  if (blocked) reasons.push("API explicitly reports Philippines restriction.");
  if (video.embeddable === false)
    reasons.push(
      "API explicitly disables embedding; manual provider-only review is possible.",
    );
  if (["TRAILER", "CLIP", "SHORT"].includes(classified.kind))
    reasons.push("Excluded promotional, excerpt or short-form content.");
  return {
    videoId: video.id,
    publisher: publisher.slug,
    publisherName: publisher.name,
    channelId: video.channelId,
    sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
    videoTitle: video.title,
    description: video.description,
    durationSeconds: video.durationSeconds,
    classification: classified.kind,
    classificationEvidence: classified.evidence,
    match,
    subtitleAvailability: /\b(?:eng(?:lish)?\s*sub|en\s*sub)\b/i.test(
      video.title + " " + video.description,
    )
      ? "PUBLISHER_CLAIM_EN"
      : video.captionFlag
        ? "CAPTIONS_LANGUAGE_UNKNOWN"
        : "UNKNOWN",
    regionVerification: blocked ? "API_BLOCKED_PH" : "UNKNOWN",
    embedVerification:
      video.embeddable === true
        ? "API_ALLOWED_ONLY"
        : video.embeddable === false
          ? "API_BLOCKED"
          : "UNKNOWN",
    approvalStatus: "UNKNOWN",
    enabled: false,
    reviewDecision: reasons.some(
      (reason) => !reason.startsWith("API explicitly disables embedding"),
    )
      ? "REJECTED"
      : "PENDING",
    reviewReason:
      reasons.join(" ") ||
      "Discovery only: full-content, mapping, Philippines, embedding and browser checks still require independent review.",
    duplicateReasons: [],
    verification: {
      publisherIdentity: `Pinned ${publisher.channelId}; identity reference: ${publisher.evidence}`,
      fullContent: classified.evidence.join(" "),
      embedPermission:
        video.embeddable === true
          ? "API embeddable=true; not browser verification."
          : "Embed permission unverified or blocked.",
      philippines: blocked
        ? "API explicitly restricts PH."
        : "Not verified by browser or title-specific regional evidence.",
      subtitles:
        "Language and actual subtitle availability not independently verified.",
      browserPlayback: "NOT_TESTED",
      seeking: "NOT_TESTED",
      fullscreen: "NOT_TESTED",
      verifiedAt: null,
    },
    discoveredAt: now,
    lastObservedAt: now,
    fixture,
  };
}
export function detectDuplicates(
  rows: Candidate[],
  existing: {
    videoId: string;
    mediaType: string;
    tmdbId: number;
    season: number | null;
    episode: number | null;
  }[] = [],
): Candidate[] {
  const videos = new Set<string>(),
    mappings = new Map<string, string>();
  for (const row of existing) {
    videos.add(row.videoId);
    if (row.episode !== null)
      mappings.set(
        `${row.mediaType}:${row.tmdbId}:${row.season}:${row.episode}`,
        row.videoId,
      );
  }
  return rows.map((row) => {
    const reasons: string[] = [];
    if (videos.has(row.videoId))
      reasons.push("Video ID already registered or repeated in this batch.");
    videos.add(row.videoId);
    if (row.match.tmdbId !== null && row.match.episode !== null) {
      const key = `${row.match.mediaType}:${row.match.tmdbId}:${row.match.season}:${row.match.episode}`,
        previous = mappings.get(key);
      if (previous && previous !== row.videoId)
        reasons.push(
          "Episode mapping already has a different reviewed or staged video; explicit alternate-source review required.",
        );
      mappings.set(key, previous ?? row.videoId);
    }
    return { ...row, duplicateReasons: reasons };
  });
}
export async function discoverVideos(
  api: YouTubeDiscoveryAPI,
  publishers: DiscoveryPublisher[],
  options: { limit: number; series?: string; playlist?: string },
) {
  const videos: { video: DiscoveryVideo; publisher: DiscoveryPublisher }[] = [];
  const errors: string[] = [];
  let examined = 0;
  const seen = new Set<string>();
  let repeatedListings = 0;
  // Publishers are round-robin so a busy uploads feed cannot consume the whole batch.
  const queues: {
    publisher: DiscoveryPublisher;
    iterator: AsyncGenerator<string>;
  }[] = [];
  for (const publisher of publishers) {
    try {
      const uploads = await api.uploads(
        publisher.channelId,
        officialProviders[publisher.slug].channelUrl.split("/").at(-1),
      );
      const playlists: string[] = [];
      if (options.playlist) {
        if ((await api.playlistOwner(options.playlist)) !== publisher.channelId)
          continue;
        playlists.push(options.playlist);
      } else {
        for await (const list of api.playlists(publisher.channelId)) {
          if (
            !options.series ||
            normalizeTitle(list.title).includes(normalizeTitle(options.series))
          )
            playlists.push(list.id);
          if (playlists.length >= Math.min(options.limit, 20)) break;
        }
        if (!options.series) playlists.push(uploads);
      }
      async function* ids() {
        for (const playlist of playlists) yield* api.playlistVideoIds(playlist);
      }
      queues.push({ publisher, iterator: ids() });
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Publisher discovery failed.",
      );
      break;
    }
  }
  while (queues.length && examined < options.limit) {
    const page: { id: string; publisher: DiscoveryPublisher }[] = [];
    for (
      let round = 0;
      round < 50 && queues.length && examined < options.limit;
      round++
    ) {
      const queue = queues.shift()!;
      try {
        const next = await queue.iterator.next();
        if (next.done) continue;
        examined++;
        queues.push(queue);
        if (!seen.has(next.value)) {
          seen.add(next.value);
          page.push({ id: next.value, publisher: queue.publisher });
        } else repeatedListings++;
      } catch (error) {
        errors.push(
          error instanceof Error ? error.message : "Playlist discovery failed.",
        );
        queues.length = 0;
        break;
      }
    }
    if (page.length) {
      try {
        const batch = await api.videos(page.map((row) => row.id));
        for (const row of page) {
          const video = batch.find((v) => v.id === row.id);
          if (video) videos.push({ video, publisher: row.publisher });
          else
            errors.push(
              `Video ${row.id} is unavailable/private/deleted; not staged.`,
            );
        }
      } catch (error) {
        errors.push(
          error instanceof Error ? error.message : "Video metadata failed.",
        );
        break;
      }
    }
    if (
      errors.some((error) => /QUOTA|RATE_LIMIT|BUDGET|PAGINATION/.test(error))
    )
      break;
  }
  if (options.playlist && !queues.length && examined === 0 && !errors.length)
    errors.push(
      "Playlist is not owned by a selected pinned publisher, or contains no public candidates.",
    );
  return { videos, examined, errors, repeatedListings };
}
export function createReport(
  rows: Candidate[],
  catalog: CatalogMapping[],
  options: {
    fixture: boolean;
    dryRun: boolean;
    limit: number;
    examined: number;
    apiRequests: number;
    errors: string[];
    repeatedListings?: number;
  },
): DiscoveryReport {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ...options,
    complete: options.errors.length === 0,
    counts: {
      candidatesDiscovered: rows.length,
      candidateFullEpisodes: rows.filter(
        (r) =>
          r.classification === "FULL_EPISODE" &&
          r.reviewDecision !== "REJECTED",
      ).length,
      highConfidenceMappings: rows.filter((r) => r.match.confidence === "HIGH")
        .length,
      duplicates:
        rows.filter((r) => r.duplicateReasons.length > 0).length +
        (options.repeatedListings ?? 0),
      verifiedPlayableEpisodes: 0,
      providerOnlyEpisodes: 0,
      unknownCandidates: rows.length,
      pendingReviewCandidates: rows.filter(
        (r) => r.reviewDecision !== "REJECTED",
      ).length,
      rejectedCandidates: rows.filter((r) => r.reviewDecision === "REJECTED")
        .length,
      approvedEpisodes: 0,
    },
    candidates: rows,
    opportunities: seasonOpportunities(rows, catalog),
  };
}
export function mergeCandidates(existing: Candidate[], incoming: Candidate[]) {
  const rows = new Map(existing.map((row) => [row.videoId, row]));
  for (const row of incoming) {
    const previous = rows.get(row.videoId);
    rows.set(
      row.videoId,
      previous
        ? {
            ...row,
            ...(previous.mappingReview &&
            JSON.stringify([
              previous.videoTitle,
              previous.description,
              previous.durationSeconds,
              previous.classification,
              previous.regionVerification,
              previous.embedVerification,
            ]) ===
              JSON.stringify([
                row.videoTitle,
                row.description,
                row.durationSeconds,
                row.classification,
                row.regionVerification,
                row.embedVerification,
              ])
              ? { match: previous.match, mappingReview: previous.mappingReview }
              : {}),
            discoveredAt: previous.discoveredAt,
            reviewDecision:
              previous.reviewDecision === "REJECTED"
                ? "REJECTED"
                : row.reviewDecision,
            reviewReason:
              previous.reviewDecision === "REJECTED"
                ? previous.reviewReason
                : row.reviewReason,
            verification: previous.verification,
            ...(previous.manualReview
              ? {
                  manualReview: previous.manualReview,
                  ...(previous.manualReviewFingerprint
                    ? {
                        manualReviewFingerprint:
                          previous.manualReviewFingerprint,
                      }
                    : {}),
                }
              : {}),
          }
        : row,
    );
  }
  return [...rows.values()].sort((a, b) => a.videoId.localeCompare(b.videoId));
}
