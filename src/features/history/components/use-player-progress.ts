"use client";
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { progressStorageKey } from "@/lib/playback/progress";
import type { PlaybackSource } from "@/types/playback";
import { progressURL, sourceIdentity } from "../types";
import { PlayerProgress, ProgressWriter } from "../player-progress";
export function usePlayerProgress(source: PlaybackSource, restart: boolean) {
  const { data, isPending } = authClient.useSession();
  const userId = data?.user.id;
  const player = useRef<HTMLVideoElement>(null);
  const controller = useRef<PlayerProgress | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [notice, setNotice] = useState("Loading saved progress…");
  // Cached media can become ready before React attaches its synthetic handlers.
  const attach = useCallback((element: HTMLVideoElement | null) => {
    player.current = element;
    if (!element) return;
    const ready = () => { if (Number.isFinite(element.duration) && element.duration > 0) setMediaReady(true); };
    element.addEventListener("loadedmetadata", ready);
    element.addEventListener("canplay", ready);
    ready();
    return () => { element.removeEventListener("loadedmetadata", ready); element.removeEventListener("canplay", ready); };
  }, []);
  useEffect(() => {
    const media = player.current, target = sourceIdentity(source);
    if (!mediaReady || isPending || !media || !target) return;
    let active = true;
    const abort = new AbortController();
    const writer = new ProgressWriter(async sample => {
      const response = await fetch("/api/viewing-progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sample), cache: "no-store", keepalive: true });
      if (!response.ok) throw new Error();
      if (active) { setNotice("Progress saved to your account."); window.dispatchEvent(new Event("bryxtv:progress-updated")); }
    }, () => { if (active) setNotice("Progress could not sync. Playback continues; the next save will retry."); });
    const progress = new PlayerProgress({ source, target, authenticated: !!userId, restart, writer,
      read: async () => {
        const response = await fetch(progressURL(target), { cache: "no-store", signal: abort.signal });
        if (!response.ok) throw new Error();
        return (await response.json()).progress;
      },
      localRead: () => localStorage.getItem(progressStorageKey(source)),
      localWrite: sample => localStorage.setItem(progressStorageKey(source), JSON.stringify(sample)),
      notice: text => { if (active) setNotice(text); },
    });
    controller.current = progress;
    void progress.restore(media);
    const flush = () => progress.flush();
    const visibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false; abort.abort(); progress.stop();
      if (controller.current === progress) controller.current = null;
      window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", visibility);
    };
  }, [source, userId, isPending, restart, mediaReady]);
  const media = (event: SyntheticEvent<HTMLVideoElement>) => { player.current = event.currentTarget; return event.currentTarget; };
  return {
    attach,
    notice,
    onReady: (event: SyntheticEvent<HTMLVideoElement>) => { const p = media(event); if (Number.isFinite(p.duration) && p.duration > 0) setMediaReady(true); },
    onPlay: (event: SyntheticEvent<HTMLVideoElement>) => { const p = media(event); if (!controller.current) p.pause(); else controller.current.play(p); },
    onTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => controller.current?.sample(media(event)),
    onPause: (event: SyntheticEvent<HTMLVideoElement>) => controller.current?.sample(media(event), true),
    onEnded: (event: SyntheticEvent<HTMLVideoElement>) => controller.current?.sample(media(event), true, true),
    onSeeked: (event: SyntheticEvent<HTMLVideoElement>) => controller.current?.sample(media(event), true),
    restart: () => { if (player.current) controller.current?.restart(player.current); },
  };
}
