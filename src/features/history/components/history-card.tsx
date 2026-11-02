"use client";
import Link from "next/link";
import { MediaPoster } from "@/features/catalog/components/media-poster";
import type { HistoryItem } from "../types";
export function progressLabel(item: HistoryItem) {
  const episode = item.mediaType === "tv" ? `S${item.seasonNumber} · E${item.episodeNumber} · ` : item.mediaType === "demo" ? "Demo excerpt · " : "";
  const remaining = Math.max(0, item.durationSeconds - item.positionSeconds);
  return `${episode}${item.completed ? "Completed" : remaining < 60 ? `${Math.ceil(remaining)} sec left` : `${Math.ceil(remaining / 60)} min left`}`;
}
export function HistoryCard({ item }: { item: HistoryItem }) {
  const percent = Math.max(0, Math.min(100, item.positionSeconds / item.durationSeconds * 100));
  return <article className="history-card">
    <Link href={item.watchHref ?? item.detailsHref} className="history-card-link" aria-label={`${item.watchHref && !item.completed ? "Resume" : "View"} ${item.title}${item.mediaType === "tv" ? ` season ${item.seasonNumber} episode ${item.episodeNumber}` : ""}`}>
      <div className="history-poster"><MediaPoster src={item.posterUrl} title={item.title} />{item.watchHref && <span className="history-play" aria-hidden="true">▶</span>}</div>
      <div className="history-meter" role="progressbar" aria-label={`${item.title} playback progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><span style={{ width: `${percent}%` }} /></div>
      <h3>{item.title}</h3><p>{progressLabel(item)}</p>
      {!item.watchHref && <small>{item.playbackAvailable ? "Exact resume unavailable · View details" : "Streaming unavailable · View details"}</small>}
    </Link>
  </article>;
}
