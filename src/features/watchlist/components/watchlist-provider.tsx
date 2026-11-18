"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth/client";
import { watchlistInput, watchlistKey, type WatchlistTitle } from "../types";
interface State { owner: string | null; keys: Set<string>; pending: Set<string>; ready: boolean; error: boolean }
interface Context extends State {
  authenticated: boolean; checking: boolean;
  toggle: (title: WatchlistTitle) => Promise<boolean>;
  retry: () => void;
}
const WatchlistContext = createContext<Context | null>(null);
const empty = (): State => ({ owner: null, keys: new Set(), pending: new Set(), ready: false, error: false });
export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const userId = data?.user.id ?? null;
  const owner = useRef(userId);
  useEffect(() => { owner.current = userId; }, [userId]);
  const [state, setState] = useState<State>(empty);
  const inFlight = useRef(new Set<string>());
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetch("/api/watchlist", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const body = await response.json();
      if (!Array.isArray(body.items)) throw new Error();
      const keys = new Set<string>(body.items.map((item: unknown) => watchlistKey(watchlistInput.parse(item))));
      if (owner.current === userId && !controller.signal.aborted)
        setState({ owner: userId, keys, pending: new Set(), ready: true, error: false });
    }).catch(() => {
      if (!controller.signal.aborted && owner.current === userId)
        setState({ ...empty(), owner: userId, error: true });
    });
    return () => controller.abort();
  }, [userId, reload]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const current = state.owner === userId && userId ? state : empty();
  async function toggle(title: WatchlistTitle) {
    const user = owner.current;
    const key = watchlistKey(title);
    const lock = `${user}:${key}`;
    if (!user || inFlight.current.has(lock) || state.owner !== user || !state.ready) return false;
    inFlight.current.add(lock);
    const saved = state.keys.has(key);
    setState(previous => {
      const keys = new Set(previous.keys);
      if (saved) keys.delete(key); else keys.add(key);
      return { ...previous, keys, pending: new Set(previous.pending).add(key) };
    });
    try {
      const response = await fetch("/api/watchlist", {
        method: saved ? "DELETE" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(title), cache: "no-store",
      });
      if (!response.ok) throw new Error();
      if (owner.current === user) setNotice({ text: saved ? "Removed from My List" : "Added to My List", error: false });
      return true;
    } catch {
      if (owner.current === user) {
        setState(previous => {
          const keys = new Set(previous.keys);
          if (saved) keys.add(key); else keys.delete(key);
          return { ...previous, keys };
        });
        setNotice({ text: "Unable to update My List. Please try again.", error: true });
      }
      return false;
    } finally {
      inFlight.current.delete(lock);
      if (owner.current === user) setState(previous => {
        const pending = new Set(previous.pending); pending.delete(key);
        return { ...previous, pending };
      });
    }
  }
  return <WatchlistContext.Provider value={{ ...current, authenticated: !!userId, checking: isPending, toggle, retry: () => setReload(n => n + 1) }}>
    {children}
    {notice && <div className={`watchlist-toast${notice.error ? " error" : ""}`} role={notice.error ? "alert" : "status"}>{notice.text}</div>}
  </WatchlistContext.Provider>;
}
export function useWatchlist() {
  const state = useContext(WatchlistContext);
  if (!state) throw new Error("WatchlistProvider is required.");
  return state;
}
