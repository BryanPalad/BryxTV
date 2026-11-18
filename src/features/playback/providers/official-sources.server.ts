import "server-only";
import manifest from "../data/official-sources.json";
import { officialManifestSchema, officialMatches, officialEmbedReady, officialSourceEligible } from "./official-policy";
const parsed = officialManifestSchema.safeParse(manifest);
const rows = parsed.success ? parsed.data : [];
export function officialSources(type: "movie" | "tv", id: number, season?: number, episode?: number) {
  return rows.filter(row => officialSourceEligible(row) && officialMatches(row,type,id,season,episode));
}
export function officialEmbedAllowed(url: string, type: "movie" | "tv", id: number, season?: number, episode?: number) {
  return officialSources(type,id,season,episode).some(row => officialEmbedReady(row) && url === `https://www.youtube-nocookie.com/embed/${row.videoId}`);
}
