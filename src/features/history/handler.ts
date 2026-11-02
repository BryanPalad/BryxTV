import "server-only";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { progressIdentity, parseProgressInput } from "./types";
import { allowedIdentity, deleteProgress, getProgress, historyPage, publicProgress, putProgress } from "./server";
const querySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), type: z.enum(["movie", "tv", "demo"]).optional(), continue: z.literal("1").optional() }).strict();
export async function handleProgress(request: Request, targetParams?: { mediaType: string; tmdbId: string }) {
  const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  try {
    if (request.method !== "GET") {
      if (request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL || request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Request origin is not allowed." }, 403);
      if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return reply({ error: "Expected JSON." }, 415);
      if (Number(request.headers.get("content-length")) > 4096) return reply({ error: "Request is too large." }, 413);
    }
    const session = await getSession();
    if (!session) return reply({ error: "Sign in to access viewing history." }, 401);
    const query = new URL(request.url).searchParams;
    if (request.method === "GET" && !targetParams) {
      const parsed = querySchema.parse(Object.fromEntries(query));
      return reply(await historyPage(session.user.id, { page: parsed.page, ...(parsed.type ? { type: parsed.type } : {}), continuing: parsed.continue === "1" }));
    }
    if (request.method === "GET") {
      const params = targetParams!;
      if (params.mediaType !== "tv" && query.size) return reply({ error: "Episode identifiers are only valid for TV." }, 400);
      if ([...query.keys()].some(key => !["season", "episode"].includes(key)) || query.getAll("season").length > 1 || query.getAll("episode").length > 1) return reply({ error: "Invalid episode." }, 400);
      const target = progressIdentity.parse(params.mediaType === "demo" ? { mediaType: "demo", demoId: params.tmdbId } : { mediaType: params.mediaType, tmdbId: /^[1-9]\d*$/.test(params.tmdbId) ? Number(params.tmdbId) : NaN, ...(query.size ? { seasonNumber: Number(query.get("season") ?? NaN), episodeNumber: Number(query.get("episode") ?? NaN) } : {}) });
      if (!allowedIdentity(target)) return reply({ error: "Unknown playback demo." }, 400);
      return reply({ progress: publicProgress(await getProgress(session.user.id, target)) });
    }
    const raw = await request.text();
    if (raw.length > 4096) return reply({ error: "Request is too large." }, 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return reply({ error: "Invalid progress." }, 400); }
    if (request.method === "PUT") {
      const sample = parseProgressInput(body);
      if (!allowedIdentity(sample)) return reply({ error: "Unknown playback demo." }, 400);
      return reply({ progress: publicProgress(await putProgress(session.user.id, sample)) });
    }
    const target = progressIdentity.parse(body);
    if (!allowedIdentity(target)) return reply({ error: "Unknown playback demo." }, 400);
    await deleteProgress(session.user.id, target);
    return reply({ removed: true });
  } catch (error) {
    return reply({ error: error instanceof z.ZodError || error instanceof Error && error.message === "Invalid observation time" ? "Invalid viewing progress." : "Viewing history is temporarily unavailable." }, error instanceof z.ZodError || error instanceof Error && error.message === "Invalid observation time" ? 400 : 503);
  }
}
