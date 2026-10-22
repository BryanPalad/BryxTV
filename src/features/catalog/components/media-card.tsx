import { mediaHref } from "@/features/catalog/utils";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { MediaPoster } from "./media-poster";
import type { MediaItem } from "@/types/catalog";

export function MediaCard({ item, rank }: { item: MediaItem; rank?: number }) {
  return (
    <article className="media-card">
      <Link
        href={mediaHref(item)}
        transitionTypes={["open-title"]}
        aria-label={`Details for ${item.title}`}
      >
        <div className="poster-frame">
          <MediaPoster src={item.posterUrl} title={item.title} />
          <span className="poster-shade" />
          <span className="media-badge">{item.categories[0]}</span>
          {rank !== undefined && (
            <span
              className="rank-number"
              aria-label={`Trending number ${rank}`}
            >
              {String(rank).padStart(2, "0")}
            </span>
          )}
          <span className="poster-action">
            <ArrowUpRight size={16} aria-hidden="true" /> Details
          </span>
        </div>
        <h3>{item.title}</h3>
        <div className="card-meta">
          <span>{item.releaseYear ?? "TBA"}</span>
          <span aria-hidden="true">·</span>
          <span>{item.genres[0]}</span>
          {item.rating !== null && (
            <span className="card-rating">
              <Star size={11} aria-hidden="true" />
              {item.rating}
            </span>
          )}
        </div>
      </Link>
    </article>
  );
}
