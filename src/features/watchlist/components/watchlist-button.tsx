"use client";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Plus } from "lucide-react";
import { useWatchlist } from "./watchlist-provider";
import { watchlistKey, type WatchlistTitle } from "../types";
export function WatchlistButton({ tmdbId, mediaType, title }: WatchlistTitle & { title: string }) {
  const state = useWatchlist();
  const router = useRouter();
  if (!state.authenticated || state.checking) return null;
  const item = { tmdbId, mediaType };
  const key = watchlistKey(item);
  const saved = state.keys.has(key);
  const pending = state.pending.has(key);
  const loading = !state.ready && !state.error;
  const label = state.error ? "Retry My List" : saved ? "In My List" : "My List";
  return <button type="button" className="watchlist-button"
    aria-label={`${state.error ? "Retry My List for" : saved ? "Remove from My List:" : "Add to My List:"} ${title}`}
    aria-pressed={saved} aria-busy={pending || loading} disabled={pending || loading}
    onClick={() => {
      if (state.error) state.retry();
      else void state.toggle(item).then(success => {
        // Recount pagination after removals, while the optimistic UI stays instant.
        if (success && window.location.pathname === "/my-list") router.refresh();
      });
    }}>
    {pending || loading ? <LoaderCircle size={16} className="auth-spinner" aria-hidden="true" /> : saved ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
    <span>{label}</span>
  </button>;
}
