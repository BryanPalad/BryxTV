"use client";
import "@videojs/react/video/neutral-skin.css";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { PlaybackSource } from "@/types/playback";
import { Video, VideoPlayer as Player, NeutralVideoSkin, usePlayer } from "@videojs/react/video";
import { usePlayerProgress } from "@/features/history/components/use-player-progress";

const HlsJsVideo = dynamic(
  () => import("@videojs/react/media/hlsjs-video").then((m) => m.HlsJsVideo),
  { ssr: false },
);

export default function VideoPlayer({ source, restart = false }: { source: PlaybackSource; restart?: boolean }) {
  const { attach: mediaRef, notice, onReady, onPlay, onTimeUpdate, onPause, onEnded, onSeeked, restart: restartPlayback } = usePlayerProgress(source, restart);
  return (
    <div className="bryxtv-player">
      <Player
        title={source.title}
        {...(source.posterUrl ? { poster: source.posterUrl } : {})}
      >
        <NeutralVideoSkin
          className="playback-skin"
          style={{ aspectRatio: "16 / 9", width: "100%" }}
        >
          {source.sourceType === "hls" ? (
            <HlsJsVideo
              ref={mediaRef}
              source={{ src: source.sourceUrl, preferPlayback: "native" }}
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
              onLoadedMetadata={onReady}
              onCanPlay={onReady}
              onPlay={onPlay}
              onTimeUpdate={onTimeUpdate}
              onPause={onPause}
              onEnded={onEnded}
              onSeeked={onSeeked}
            >
              {source.subtitles?.map((track) => (
                <track
                  key={`${track.language}:${track.src}`}
                  src={track.src}
                  kind="subtitles"
                  label={track.label}
                  srcLang={track.language}
                  default={track.default ?? false}
                />
              ))}
            </HlsJsVideo>
          ) : (
            <Video
              ref={mediaRef}
              src={source.sourceUrl}
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
              onLoadedMetadata={onReady}
              onCanPlay={onReady}
              onPlay={onPlay}
              onTimeUpdate={onTimeUpdate}
              onPause={onPause}
              onEnded={onEnded}
              onSeeked={onSeeked}
            >
              {source.subtitles?.map((track) => (
                <track
                  key={`${track.language}:${track.src}`}
                  src={track.src}
                  kind="subtitles"
                  label={track.label}
                  srcLang={track.language}
                  default={track.default ?? false}
                />
              ))}
            </Video>
          )}
        </NeutralVideoSkin>
        <PlaybackError />
      </Player>
      <div className="player-toolbar">
        <button className="playback-button secondary" onClick={restartPlayback}>
          Restart from Beginning
        </button>
        <p role="status">{notice}</p>
      </div>
      <p className="player-help">
        Space / K: play or pause · ← / →: seek · M: mute · F: fullscreen · C:
        captions. Click or focus the player first.
      </p>
    </div>
  );
}

function PlaybackError() {
  const error = usePlayer((state) => state.error);
  const [hasFailed, setHasFailed] = useState(false);
  // Dismissing the skin's dialog clears its error state, but must keep our
  // recovery action visible until the player is reloaded.
  if (error && !hasFailed) setHasFailed(true);
  if (!error && !hasFailed) return null;
  return (
    <div className="player-error" role="alert">
      <h2>Playback could not start</h2>
      <p>
        The video may be unavailable or your browser may not support it. Check
        your connection and try again.
      </p>
      <button
        className="playback-button"
        onClick={() => window.location.reload()}
      >
        Retry playback
      </button>
    </div>
  );
}
