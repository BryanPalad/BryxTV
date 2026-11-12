import "server-only";
import { z } from "zod";
import { videoSchema, type DiscoveryVideo } from "./types";
export class DiscoveryAPIError extends Error {
  constructor(
    public readonly code:
      | "MISSING_KEY"
      | "QUOTA"
      | "RATE_LIMIT"
      | "BUDGET"
      | "NETWORK"
      | "INVALID_RESPONSE"
      | "API_ERROR"
      | "PAGINATION",
  ) {
    super(`YouTube discovery stopped: ${code}.`);
  }
}
export interface APICache {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
}
const pageSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())).max(50),
  nextPageToken: z.string().max(500).optional(),
});
const text = (v: unknown) => (typeof v === "string" ? v : "");
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
export function isoDuration(value: unknown): number | null {
  const m =
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      text(value),
    );
  return m && m.slice(1).some(Boolean)
    ? Number(m[1] ?? 0) * 86400 +
        Number(m[2] ?? 0) * 3600 +
        Number(m[3] ?? 0) * 60 +
        Number(m[4] ?? 0)
    : null;
}
export class YouTubeDiscoveryAPI {
  public requests = 0;
  private stopped: DiscoveryAPIError | null = null;
  constructor(
    private readonly options: {
      key: string | undefined;
      fetcher?: typeof fetch;
      cache?: APICache;
      budget?: number;
    },
  ) {}
  private async request(
    endpoint: "channels" | "playlists" | "playlistItems" | "videos",
    params: Record<string, string>,
  ) {
    if (!this.options.key?.trim()) throw new DiscoveryAPIError("MISSING_KEY");
    if (this.stopped) throw this.stopped;
    const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    const cacheKey = url.toString();
    const cached = await this.options.cache?.get(cacheKey);
    if (cached !== undefined) {
      const parsed = pageSchema.safeParse(cached);
      if (parsed.success) return parsed.data;
    }
    if (this.requests >= (this.options.budget ?? 100))
      throw new DiscoveryAPIError("BUDGET");
    this.requests++;
    let response: Response;
    try {
      response = await (this.options.fetcher ?? fetch)(url, {
        headers: { "X-Goog-Api-Key": this.options.key },
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch {
      throw new DiscoveryAPIError("NETWORK");
    }
    if (!response.ok) {
      let reason = "";
      try {
        const body = record(await response.json());
        const errors = record(body.error).errors;
        if (Array.isArray(errors)) reason = text(record(errors[0]).reason);
      } catch {}
      if (["quotaExceeded", "dailyLimitExceeded"].includes(reason)) {
        this.stopped = new DiscoveryAPIError("QUOTA");
        throw this.stopped;
      }
      if (
        response.status === 429 ||
        ["rateLimitExceeded", "userRateLimitExceeded"].includes(reason)
      ) {
        this.stopped = new DiscoveryAPIError("RATE_LIMIT");
        throw this.stopped;
      }
      throw new DiscoveryAPIError("API_ERROR");
    }
    try {
      const data = pageSchema.parse(await response.json());
      await this.options.cache?.set(cacheKey, data);
      return data;
    } catch {
      throw new DiscoveryAPIError("INVALID_RESPONSE");
    }
  }
  private async *pages(
    endpoint: "playlists" | "playlistItems",
    params: Record<string, string>,
    maxPages = 20,
  ) {
    let token = "";
    const visited = new Set<string>();
    for (let page = 0; page < maxPages; page++) {
      if (visited.has(token)) throw new DiscoveryAPIError("PAGINATION");
      visited.add(token);
      const result = await this.request(endpoint, {
        ...params,
        ...(token ? { pageToken: token } : {}),
      });
      yield result.items;
      if (!result.nextPageToken) return;
      token = result.nextPageToken;
    }
    throw new DiscoveryAPIError("BUDGET");
  }
  async uploads(channelId: string, expectedHandle?: string) {
    const result = await this.request("channels", {
      part: "snippet,contentDetails",
      id: channelId,
    });
    const channel = result.items.find((item) => item.id === channelId);
    if (
      expectedHandle &&
      text(record(channel?.snippet).customUrl).toLowerCase() !==
        expectedHandle.toLowerCase()
    )
      throw new DiscoveryAPIError("INVALID_RESPONSE");
    const id = text(
      record(record(channel?.contentDetails).relatedPlaylists).uploads,
    );
    if (!/^[A-Za-z0-9_-]{10,150}$/.test(id))
      throw new DiscoveryAPIError("INVALID_RESPONSE");
    return id;
  }
  async playlistOwner(id: string) {
    if (!/^[A-Za-z0-9_-]{10,150}$/.test(id))
      throw new DiscoveryAPIError("INVALID_RESPONSE");
    const result = await this.request("playlists", { part: "snippet", id });
    const row = result.items.find((item) => item.id === id);
    return text(record(row?.snippet).channelId);
  }
  async *playlists(channelId: string) {
    for await (const page of this.pages("playlists", {
      part: "snippet",
      channelId,
      maxResults: "50",
    }))
      for (const row of page) {
        const snippet = record(row.snippet);
        if (
          snippet.channelId === channelId &&
          /^[A-Za-z0-9_-]{10,150}$/.test(text(row.id))
        )
          yield { id: text(row.id), title: text(snippet.title) };
      }
  }
  async *playlistVideoIds(playlistId: string) {
    for await (const page of this.pages("playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: "50",
    }))
      for (const row of page) {
        const id = text(record(row.contentDetails).videoId);
        if (/^[A-Za-z0-9_-]{11}$/.test(id)) yield id;
      }
  }
  async videos(ids: string[]): Promise<DiscoveryVideo[]> {
    const output: DiscoveryVideo[] = [];
    const unique = [...new Set(ids)];
    if (unique.some((id) => !/^[A-Za-z0-9_-]{11}$/.test(id)))
      throw new DiscoveryAPIError("INVALID_RESPONSE");
    for (let start = 0; start < unique.length; start += 50) {
      const batch = unique.slice(start, start + 50);
      const result = await this.request("videos", {
        part: "snippet,contentDetails,status",
        id: batch.join(","),
      });
      for (const row of result.items) {
        if (!batch.includes(text(row.id))) continue;
        const snippet = record(row.snippet),
          details = record(row.contentDetails),
          status = record(row.status),
          region = record(details.regionRestriction);
        const parsed = videoSchema.safeParse({
          id: row.id,
          channelId: snippet.channelId,
          title: text(snippet.title),
          description: text(snippet.description),
          publishedAt: text(snippet.publishedAt),
          durationSeconds: isoDuration(details.duration),
          embeddable:
            typeof status.embeddable === "boolean" ? status.embeddable : null,
          public: status.privacyStatus === "public",
          allowedRegions: Array.isArray(region.allowed) ? region.allowed : null,
          blockedRegions: Array.isArray(region.blocked) ? region.blocked : null,
          captionFlag:
            details.caption === "true"
              ? true
              : details.caption === "false"
                ? false
                : null,
        });
        if (!parsed.success) throw new DiscoveryAPIError("INVALID_RESPONSE");
        output.push(parsed.data);
      }
    }
    return output;
  }
}
