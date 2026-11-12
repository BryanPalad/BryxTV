"use client";
import { useState } from "react";
import { providerEligible } from "@/features/playback/providers/eligibility";
import { Play } from "lucide-react";
import type { Trailer } from "@/types/catalog";
export function TrailerPlayer({ trailer }: { trailer: Trailer }) {
  const [playing, setPlaying] = useState(false);
  if (!providerEligible("youtube-privacy")) return <p className="section-message">An official supported trailer is not available for this title.</p>;
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
