import "server-only";
import type { MediaItem } from "@/types/catalog";
import type { WatchlistTitle } from "./types";
export interface SavedTitle extends WatchlistTitle { item: MediaItem | null }
/** Six in-flight requests at most; metadata failure never removes a saved record. */
export async function watchlistMetadata(titles: WatchlistTitle[], load: (title: WatchlistTitle) => Promise<MediaItem>): Promise<SavedTitle[]> {
  const results: SavedTitle[] = new Array(titles.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, titles.length) }, async () => {
    while (next < titles.length) {
      const index = next++;
      const title = titles[index]!;
      try { results[index] = { ...title, item: await load(title) }; }
      catch { results[index] = { ...title, item: null }; }
    }
  }));
  return results;
}
