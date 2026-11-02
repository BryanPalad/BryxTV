import { officialSources } from "@/features/playback/providers/official-sources.server";
import { viewingState } from "@/features/playback/providers/official-policy";
import { z } from "zod";
import { progressIdentity } from "@/features/history/types";
import { resolveSources } from "@/features/playback/providers/resolver";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  try {
    const query = new URL(request.url).searchParams;
    if ([...query.keys()].some(key => !["mediaType", "tmdbId", "seasonNumber", "episodeNumber"].includes(key)) || [...query.keys()].some(key => query.getAll(key).length > 1)) return reply({error:"Invalid media identifiers."},400);
    const value = Object.fromEntries(query);
    const identity = progressIdentity.parse({ mediaType: value.mediaType, tmdbId: /^[1-9]\d*$/.test(value.tmdbId ?? "") ? Number(value.tmdbId) : NaN, ...(value.seasonNumber !== undefined || value.episodeNumber !== undefined ? { seasonNumber: /^(0|[1-9]\d{0,3})$/.test(value.seasonNumber ?? "") ? Number(value.seasonNumber) : NaN, episodeNumber: /^[1-9]\d{0,3}$/.test(value.episodeNumber ?? "") ? Number(value.episodeNumber) : NaN } : {}) });
    if (identity.mediaType === "demo") return reply({error:"Invalid media identifiers."},400);
    const result = await resolveSources({ mediaId: `tmdb:${identity.mediaType}:${identity.tmdbId}`, ...(identity.mediaType === "tv" ? { season: identity.seasonNumber, episode: identity.episodeNumber } : {}) });
    const official = officialSources(identity.mediaType,identity.tmdbId,identity.mediaType === "tv" ? identity.seasonNumber : undefined,identity.mediaType === "tv" ? identity.episodeNumber : undefined);
    return reply({...result, availability: viewingState(result.sources.length > 0,official,result.pending || result.failed)}, result.failed ? 503 : 200);
  } catch(error) { return reply({error:error instanceof z.ZodError ? "Invalid media identifiers." : "Playback sources are temporarily unavailable."},error instanceof z.ZodError ? 400 : 503); }
}
