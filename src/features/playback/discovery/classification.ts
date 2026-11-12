import type { Candidate, DiscoveryVideo } from "./types";
export function classifyVideo(video: DiscoveryVideo): {
  kind: Candidate["classification"];
  evidence: string[];
} {
  const title = video.title,
    body = `${title}\n${video.description}`,
    seconds = video.durationSeconds ?? 0;
  if (/\b(trailer|teaser|preview|promo(?:tional)?)\b|予告|예고/i.test(title))
    return {
      kind: "TRAILER",
      evidence: ["Title explicitly labels promotional material."],
    };
  if (
    /\b(highlights?|clips?|recap|reaction|behind.the.scenes|interview|opening|ending|OST|music video)\b|하이라이트/i.test(
      title,
    )
  )
    return {
      kind: "CLIP",
      evidence: [
        "Title explicitly labels an excerpt or supplementary material.",
      ],
    };
  if (/#shorts?\b/i.test(body) || (seconds > 0 && seconds < 180))
    return {
      kind: "SHORT",
      evidence: [
        "Short-form marker or duration below three minutes; not a complete episode claim.",
      ],
    };
  if (
    /\b(?:complete|full)\s+(?:series|season)\b|\b(?:ep(?:isodes?)?\.?)\s*\d+\s*[-–~]\s*\d+|compilation/i.test(
      title,
    )
  )
    return {
      kind: "SEASON_COMPILATION",
      evidence: [
        "Title describes a season compilation or episode range; no independent episode boundaries inferred.",
      ],
    };
  const episode = /\b(?:episodes?|ep)\.?\s*\d+|S\d+E\d+/i.test(title);
  if (
    episode &&
    seconds >= 600 &&
    /\b(?:episode|ep|full|complete)\b/i.test(body)
  )
    return {
      kind: "FULL_EPISODE",
      evidence: [
        "Publisher title contains an individual episode marker and runtime is at least ten minutes. Completeness remains a manual review requirement.",
      ],
    };
  if (
    /\b(?:full\s*(?:movie|film)|(?:movie|film)\s*full)\b/i.test(title) &&
    seconds >= 2400
  )
    return {
      kind: "FULL_MOVIE",
      evidence: [
        "Publisher title explicitly identifies a full movie and runtime is at least forty minutes; manual verification required.",
      ],
    };
  return {
    kind: "UNKNOWN",
    evidence: [
      "Insufficient explicit full-content evidence; duration alone is not proof.",
    ],
  };
}
