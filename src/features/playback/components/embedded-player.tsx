"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { providers, providerAllowsURL } from "../providers/registry";
import type { PlaybackOption } from "../providers/types";
export function EmbeddedPlayer({ source, children }: { source: PlaybackOption; children?: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      setFullscreen(document.fullscreenElement === frame.current);
      setFullscreenError(null);
    };
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  async function enterFullscreen() {
    setFullscreenError(null);
    if (typeof frame.current?.requestFullscreen !== "function") {
      setFullscreenError("Fullscreen is unavailable in this browser. Use the provider’s fullscreen control if supported.");
      return;
    }
    try { await frame.current.requestFullscreen(); }
    catch { setFullscreenError("Fullscreen could not open. You can continue watching inline or use the provider’s fullscreen control."); }
  }
  async function exitFullscreen() {
    try { await document.exitFullscreen(); }
    catch { setFullscreenError("Fullscreen could not close. Use your browser’s exit fullscreen control."); }
  }
  const [state, setState] = useState<"loading" | "loaded" | "error" | "timeout">("loading");
  const [attempt, setAttempt] = useState(0);
  const provider = [...providers.values()].find(p => p.type === "EXTERNAL_EMBED" && p.enabled && p.name === source.provider && providerAllowsURL(p, source.sourceUrl));
  useEffect(() => {
    const timer = setTimeout(() => setState(previous => previous === "loading" ? "timeout" : previous), 15000);
    return () => clearTimeout(timer);
  }, [attempt]);
  if (!provider) return <p role="alert">This embed is not approved for playback.</p>;
  return <section className="external-player" aria-label={`${source.label} embedded player`}>
    <div className={`embed-frame${provider.slug === "youtube-privacy" ? " youtube-frame" : ""}`} ref={frame}><iframe key={attempt} src={source.sourceUrl} title={`${source.label} — ${source.provider}`} allow="fullscreen; picture-in-picture; encrypted-media" allowFullScreen={source.fullscreen} sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setState("loaded")} onError={() => setState("error")} />{fullscreen && <button className="playback-button embed-fullscreen-exit" onClick={() => { void exitFullscreen(); }}>Exit fullscreen</button>}</div>
    {state === "loading" && <p role="status">Loading embedded player…</p>}
    {state === "error" && <p role="alert">The embedded player may be blocked or unavailable. Try again or choose another source.</p>}
    {state === "timeout" && <p role="status">Taking longer than expected? Retry if playback hasn’t started.</p>}
    {(state === "error" || state === "timeout") && <button className="embed-retry" onClick={() => { setState("loading"); setAttempt(value => value + 1); }}>Retry player</button>}
    {children}
    <details className="playback-information"><summary>Playback options</summary>
      <div className="player-toolbar">{state !== "error" && state !== "timeout" && <button className="embed-retry" onClick={() => { setState("loading"); setAttempt(value => value + 1); }}>Retry player</button>}{source.fullscreen && provider.slug !== "internet-archive" && <button className="playback-button secondary" onClick={() => { void enterFullscreen(); }}>Fullscreen</button>}</div>
      <p className="player-help">Exact resume and viewing-progress tracking are unavailable for this source. Your existing saved progress is preserved.</p>
    </details>
    {fullscreenError && <p role="status">{fullscreenError}</p>}
  </section>;
}
