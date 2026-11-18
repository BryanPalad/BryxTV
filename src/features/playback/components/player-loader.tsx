"use client";
import dynamic from "next/dynamic";
import type { PlaybackSource } from "@/types/playback";
const VideoPlayer = dynamic(() => import("./video-player"), {
  ssr: false,
  loading: () => (
    <div className="player-loading" role="status">
      Loading video player…
    </div>
  ),
});
export function PlayerLoader({ source, restart = false }: { source: PlaybackSource; restart?: boolean }) {
  return <VideoPlayer key={source.id} source={source} restart={restart} />;
}
