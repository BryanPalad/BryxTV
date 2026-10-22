import { mediaHref } from "@/features/catalog/utils";
import Link from "next/link";
import { Info, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaPoster } from "./media-poster";
import type { MediaItem } from "@/types/catalog";

export function HeroSlide({
  item,
  initial = false,
  headingLevel = 1,
}: {
  item: MediaItem;
  initial?: boolean;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <>
      <div className="hero-backdrop">
        <MediaPoster
          src={item.backdropUrl ?? item.posterUrl}
          title={item.title}
          backdrop
          preload={initial}
        />
      </div>
      <div className="hero-scrim" />
      <div className="hero-content">
        <span className="featured-kicker">
          <span /> The featured collection
        </span>
        <div className="hero-meta">
          <span>{item.genres.join(" / ")}</span>
          <span aria-hidden="true">·</span>
          <span>{item.releaseYear ?? "TBA"}</span>

          <span>{item.mediaType === "tv" ? "Series" : "Film"}</span>
        </div>
        <Heading className="hero-title">{item.title}</Heading>
        <p className="hero-description">{item.overview}</p>
        <div className="hero-actions">
          <Button asChild size="lg" className="primary-action">
            <Link href={mediaHref(item)} transitionTypes={["open-title"]}>
              <Info size={18} aria-hidden="true" /> More Info
            </Link>
          </Button>
          <span className="preview-status">
            <Film size={15} aria-hidden="true" /> Streaming unavailable
          </span>
        </div>
      </div>
    </>
  );
}
