"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HistoryCard } from "./history-card";
import { itemIdentity, type HistoryItem } from "../types";
export function HistoryGrid({ items }: { items: HistoryItem[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  async function remove(item: HistoryItem) {
    setPending(item.contentKey); setError(null);
    try {
      const response = await fetch("/api/viewing-progress", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(itemIdentity(item)), cache: "no-store" });
      if (!response.ok) throw new Error();
      window.dispatchEvent(new Event("bryxtv:progress-updated"));
      startRefresh(() => router.refresh());
    } catch { setError("History could not be updated. Please try again."); }
    finally { setPending(null); }
  }
  return <>{error && <p role="alert" className="auth-field-error">{error}</p>}{!items.length ? <div className="catalog-state"><h2>Your next story starts here</h2><p>Titles you watch will appear here. Try an authorized video from the playback demos.</p><a className="playback-button" href="/demos">Explore demos</a></div> : <div className="history-grid">{items.map(item => <div key={item.contentKey}><HistoryCard item={item} /><button className="history-remove" disabled={!!pending || refreshing} onClick={() => remove(item)} aria-label={`Remove ${item.title}${item.mediaType === "tv" ? ` season ${item.seasonNumber} episode ${item.episodeNumber}` : ""} from history`}>{pending === item.contentKey ? "Removing…" : "Remove from History"}</button></div>)}</div>}</>;
}
