"use client";
import { useState } from "react";
import { Play } from "lucide-react";
import type { Trailer } from "@/types/catalog";
export function TrailerPlayer({ trailer }: { trailer: Trailer }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="trailer-player">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}`}
          title={`Official trailer: ${trailer.name}`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      ) : (
        <button onClick={() => setPlaying(true)}>
          <Play size={28} aria-hidden="true" />
          <strong>Play official trailer</strong>
          <span>Trailer only · Hosted by YouTube</span>
        </button>
      )}
    </div>
  );
}
