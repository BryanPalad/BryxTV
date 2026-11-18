"use client";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { MediaCard } from "@/features/catalog/components/media-card";
import { MediaPoster } from "@/features/catalog/components/media-poster";
import { useWatchlist } from "./watchlist-provider";
import { watchlistKey } from "../types";
import type { SavedTitle } from "../metadata";
export function EmptyWatchlist() {
  return <div className="watchlist-empty">
    <Bookmark size={40} aria-hidden="true" />
    <h2>Your list is looking a little empty.</h2>
    <p>Save movies and TV shows you want to watch, and they&apos;ll appear here.</p>
    <Link href="/movies" className="header-sign-in">Browse Movies</Link>
  </div>;
}
export function SavedGrid({ titles }: { titles: SavedTitle[] }) {
  const state = useWatchlist();
  if (!state.authenticated && !state.checking) return null;
  const visible = state.ready ? titles.filter(title => state.keys.has(watchlistKey(title))) : titles;
  if (!visible.length) return <EmptyWatchlist />;
  return <div className="poster-grid watchlist-grid">
    {visible.map(title => title.item ? <MediaCard key={watchlistKey(title)} item={title.item} /> :
      <article className="media-card unavailable-title" key={watchlistKey(title)}>
        <Link href={`/${title.mediaType}/${title.tmdbId}`}>
          <div className="poster-frame"><MediaPoster src={null} title="Metadata unavailable" /></div>
          <h3>{title.mediaType === "movie" ? "Movie" : "TV series"} #{title.tmdbId}</h3>
        </Link>
        <p className="section-message">Title information is temporarily unavailable. Your saved title is safe.</p>
      </article>)
    }
  </div>;
}
