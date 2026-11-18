"use client";
import { useState, useSyncExternalStore } from "react";
import { PlayerLoader } from "./player-loader";
import { EmbeddedPlayer } from "./embedded-player";
import { PlaybackAttribution } from "./playback-attribution";
import { providers, providerAllowsURL } from "../providers/registry";
import type { PlaybackOption } from "../providers/types";
const subscribePreference = () => () => {};
export function SourceSelector({ sources, targetKey, restart = false, preferredId }: { sources: PlaybackOption[]; targetKey: string; restart?: boolean; preferredId?: string | undefined }) {
  const [selection, setSelection] = useState<{ key: string; id: string } | null>(null);
  const savedId = useSyncExternalStore(subscribePreference, () => {
    try { return sessionStorage.getItem(`bryxtv:source:${targetKey}`); } catch { return null; }
  }, () => null);
  const id = selection?.key === targetKey ? selection.id : preferredId ?? savedId;
  const eligibleSources = sources.filter(option => [...providers.values()].some(provider => provider.enabled && provider.type === option.type && provider.name === option.provider && providerAllowsURL(provider, option.sourceUrl)));
  const source = eligibleSources.find(option => option.id === id) ?? eligibleSources[0];
  if (!source) return <p>Video Not Available</p>;
  function select(id: string) {
    setSelection({ key: targetKey, id });
    try { sessionStorage.setItem(`bryxtv:source:${targetKey}`, id); } catch { /* Optional preference. */ }
  }
  const sourcePicker = eligibleSources.length > 1 ? <div className="source-picker"><label htmlFor="playback-source">Playback source</label><select id="playback-source" value={source.id} aria-describedby="selected-source-details" onChange={event => select(event.target.value)}>{eligibleSources.map((option, index) => <option key={option.id} value={option.id} title={option.label}>{option.provider}{eligibleSources.filter(item => item.provider === option.provider).length > 1 ? ` · ${index + 1}` : ""}</option>)}</select><span id="selected-source-details" className="sr-only">{source.provider}: {source.label}</span></div> : <p className="playback-provider">{source.provider}</p>;
  return <div className="playback-options">
    {source.type === "EXTERNAL_EMBED" ? <EmbeddedPlayer key={source.id} source={source}>{sourcePicker}</EmbeddedPlayer> : source.video ? <><PlayerLoader key={source.id} source={source.video} restart={restart} />{sourcePicker}{source.video.attribution.source && <PlaybackAttribution source={source.video} />}</> : <p role="alert">This playback source is unavailable.</p>}

    {source.preview && <details className="playback-development"><summary>Development verification</summary><p>Development preview: playback is unverified. This source remains UNKNOWN, disabled, and unavailable through the public resolver.</p><p>{source.provider} · {source.label}</p></details>}

  </div>;
}
