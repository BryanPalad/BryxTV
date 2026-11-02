import "server-only";
import { watchlistInput, type WatchlistTitle, type WatchlistResult } from "./types";
export interface WatchlistHandlers {
  getUser: () => Promise<string | null>;
  list: (userId: string) => Promise<WatchlistTitle[]>;
  has: (userId: string, item: WatchlistTitle) => Promise<boolean>;
  add: (userId: string, item: WatchlistTitle) => Promise<void>;
  remove: (userId: string, item: WatchlistTitle) => Promise<void>;
}
export async function handleWatchlist(request: Request, deps: WatchlistHandlers) {
  const reply = (body: WatchlistResult, status = 200) => Response.json(body, {
    status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
  try {
    if (!["GET", "POST", "DELETE"].includes(request.method)) return reply({ error: "Method not allowed." }, 405);
    if (request.method !== "GET") {
      const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
      if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site")
        return reply({ error: "Request origin is not allowed." }, 403);
      if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
        return reply({ error: "Expected JSON." }, 415);
      if (Number(request.headers.get("content-length")) > 1024) return reply({ error: "Request is too large." }, 413);
    }
    const userId = await deps.getUser();
    if (!userId) return reply({ error: "Sign in to use My List." }, 401);
    if (request.method === "GET") {
      const query = new URL(request.url).searchParams;
      if (query.size) {
        const rawId = query.get("tmdbId") ?? "";
        const parsed = watchlistInput.safeParse({ ...Object.fromEntries(query), tmdbId: /^[1-9]\d*$/.test(rawId) ? Number(rawId) : NaN });
        if (!parsed.success || query.getAll("tmdbId").length !== 1 || query.getAll("mediaType").length !== 1)
          return reply({ error: "Choose a valid movie or TV series." }, 400);
        return reply({ item: parsed.data, saved: await deps.has(userId, parsed.data) });
      }
      return reply({ items: await deps.list(userId) });
    }
    const text = await request.text();
    if (text.length > 1024) return reply({ error: "Request is too large." }, 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { return reply({ error: "Invalid title." }, 400); }
    const parsed = watchlistInput.safeParse(body);
    if (!parsed.success) return reply({ error: "Choose a valid movie or TV series." }, 400);
    if (request.method === "POST") await deps.add(userId, parsed.data);
    else await deps.remove(userId, parsed.data);
    return reply({ item: parsed.data, saved: request.method === "POST" });
  } catch {
    return reply({ error: "My List is temporarily unavailable. Please try again." }, 503);
  }
}
