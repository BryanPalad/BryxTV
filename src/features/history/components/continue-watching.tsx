"use client";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { ContentRow } from "@/features/catalog/components/content-row";
import { SectionHeading } from "@/features/catalog/components/section-heading";
import { HistoryCard } from "./history-card";
import type { HistoryItem } from "../types";
export function ContinueWatching() {
  const { data, isPending } = authClient.useSession();
  const userId = data?.user.id;
  const [result, setResult] = useState<{ owner: string; items: HistoryItem[] } | null>(null);
  useEffect(() => {
    if (!userId || isPending) return;
    let active = true, generation = 0;
    const abort = new AbortController();
    async function load() {
      const request = ++generation;
      try {
        const response = await fetch("/api/viewing-progress?continue=1", { cache: "no-store", signal: abort.signal });
        if (!response.ok) throw new Error();
        const payload = await response.json();
        if (active && request === generation) setResult({ owner: userId!, items: payload.items });
      } catch { if (active && request === generation) setResult(null); }
    }
    void load();
    window.addEventListener("bryxtv:progress-updated", load);
    return () => { active = false; abort.abort(); window.removeEventListener("bryxtv:progress-updated", load); };
  }, [userId, isPending]);
  if (isPending || !userId || result?.owner !== userId || !result.items.length) return null;
  return <ContentRow id="continue-watching" heading={<SectionHeading id="continue-watching" title="Continue Watching" description="Pick up where your story left off." href="/history" />}>
    {result.items.map(item => <HistoryCard key={item.contentKey} item={item} />)}
  </ContentRow>;
}
