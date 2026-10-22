"use client";

import Image from "next/image";
import { Film } from "lucide-react";
import { useState } from "react";

interface MediaPosterProps {
  src?: string | null;
  title: string;
  backdrop?: boolean;
  profile?: boolean;
  preload?: boolean;
}
/** Reserves its frame even when an asset is missing or fails to load. */
export function MediaPoster({
  src,
  title,
  backdrop = false,
  profile = false,
  preload = false,
}: MediaPosterProps) {
  const [failedSource, setFailedSource] = useState<string>();
  if (!src || src === failedSource) {
    return (
      <div
        className="image-fallback"
        role="img"
        aria-label={`${title} — artwork unavailable`}
      >
        <Film size={backdrop ? 48 : 30} aria-hidden="true" />
        <span>{title}</span>
        <small>Artwork unavailable</small>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={
        backdrop
          ? `Cinematic scene from ${title}`
          : profile
            ? `Portrait of ${title}`
            : `${title} poster`
      }
      fill
      sizes={
        backdrop
          ? "100vw"
          : profile
            ? "130px"
            : "(max-width: 767px) 42vw, (max-width: 1100px) 25vw, 17vw"
      }
      preload={preload}
      className="media-image"
      onError={() => setFailedSource(src)}
    />
  );
}
