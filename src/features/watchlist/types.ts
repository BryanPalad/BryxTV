import { z } from "zod";
export const watchlistInput = z.object({
  tmdbId: z.number().int().positive().max(2_147_483_647),
  mediaType: z.enum(["movie", "tv"]),
}).strict();
export type WatchlistTitle = z.infer<typeof watchlistInput>;
export const watchlistKey = (item: WatchlistTitle) => `${item.mediaType}:${item.tmdbId}`;

export type WatchlistResult =
  | { items: WatchlistTitle[] }
  | { item: WatchlistTitle; saved: boolean }
  | { error: string };
