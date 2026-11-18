import { readFile, writeFile, rename } from "node:fs/promises";
import nextEnv from "@next/env";
import { z } from "zod";
import { verifyDevelopmentDatabase } from "./development-db";
import { providers, providerAllowsURL } from "../src/features/playback/providers/registry";
import { officialSourceSchema, officialProviders, youtubeWatchId, officialEmbedReady, officialManifestSchema } from "../src/features/playback/providers/official-policy";
import { progressIdentity, progressKey } from "../src/features/history/types";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
async function main() {
  await verifyDevelopmentDatabase();
  const { getPrisma } = await import("../src/lib/db/prisma");
  const db = getPrisma();
  try {
    const [command, argument, status, evidence, confirmation] = process.argv.slice(2);
    if (command === "official-add") {
      const input = officialSourceSchema.parse(JSON.parse(await readFile(argument!, "utf8")));
      if (input.status !== "UNKNOWN" && status !== "--reviewed") throw new Error();
      const path = new URL("../src/features/playback/data/official-sources.json", import.meta.url);
      const existing = JSON.parse(await readFile(path, "utf8")) as unknown[];
      const rows = existing.map(row => officialSourceSchema.parse(row));
      const next = officialManifestSchema.parse([...rows.filter(row => row.key !== input.key), input]);
      if (Date.parse(input.reviewedAt) > Date.now() + 60000) throw new Error();
      const temporary = new URL("../src/features/playback/data/official-sources.json.tmp", import.meta.url);
      await writeFile(temporary, JSON.stringify(next, null, 2) + "\n");
      await rename(temporary, path);
      console.log("Official source review saved. This does not approve or enable embedded playback.");
    } else if (command === "official-audit") {
      const rows = officialManifestSchema.parse(JSON.parse(await readFile(new URL("../src/features/playback/data/official-sources.json", import.meta.url), "utf8")));
      for (const row of rows) {
        const source = await db.playbackSource.findFirst({where:{sourceUrl:`https://www.youtube-nocookie.com/embed/${row.videoId}`,mediaType:row.mediaType,tmdbId:row.tmdbId,seasonNumber:row.season,episodeNumber:row.episode}});
        console.log(JSON.stringify({key:row.key,videoId:row.videoId,mapping:`${row.mediaType}:${row.tmdbId}:${row.season ?? "-"}:${row.episode ?? "-"}`,review:row.status,reviewedAt:row.reviewedAt,region:row.region,embedding:row.embedding,access:row.access,registered:!!source,enabled:source?.enabled ?? false,availability:source?.availabilityStatus ?? "UNREGISTERED",lastCheckedAt:source?.lastCheckedAt ?? null,needsReview:!officialEmbedReady(row) || !source?.enabled || source.availabilityStatus !== "AVAILABLE"}));
      }
      console.log("Manifest valid: unique keys, video IDs and episode mappings. This audit never enables or approves a source.");
    } else if (command === "official-review") {
      const path = new URL("../src/features/playback/data/official-sources.json", import.meta.url);
      const rows = (JSON.parse(await readFile(path,"utf8")) as unknown[]).map(row => officialSourceSchema.parse(row));
      for (const row of rows.filter(row => !argument || row.key === argument)) console.log(JSON.stringify({key:row.key,provider:officialProviders[row.provider].name,format:row.format,status:row.status,enabled:row.enabled,region:row.region,embedding:row.embedding,access:row.access,reviewedAt:row.reviewedAt,evidence:row.evidence}));
    } else if (command === "provider") {
      const policy = providers.get(argument ?? "");
      if (!policy?.enabled) throw new Error();
      await db.playbackProvider.upsert({ where: { slug: policy.slug }, create: { slug: policy.slug, name: policy.name, type: policy.type, enabled: true }, update: { name: policy.name, type: policy.type, enabled: true } });
      console.log("Reviewed provider registered in development.");
    } else if (command === "disable") {
      if (!argument) throw new Error();
      await db.playbackSource.update({ where: { id: argument }, data: { enabled: false } });
      console.log("Playback source disabled in development.");
    } else if (command === "add") {
      const input = z.object({ provider: z.string(), target: progressIdentity, sourceUrl: z.string().max(2048), displayLabel: z.string().trim().min(1).max(120), priority: z.number().int().min(0).max(10000).default(100), authorizationEvidence: z.string().trim().min(20).max(4000) }).strict().parse(JSON.parse(await readFile(argument!, "utf8")));
      if (input.target.mediaType === "demo") throw new Error();
      const target = input.target;
      const policy = providers.get(input.provider);
      if (!policy?.enabled || !providerAllowsURL(policy, input.sourceUrl)) throw new Error();
      if (policy.slug === "youtube-privacy") {
        const manifest = (JSON.parse(await readFile(new URL("../src/features/playback/data/official-sources.json", import.meta.url),"utf8")) as unknown[]).map(row => officialSourceSchema.parse(row));
        const approved = manifest.some(row => row.enabled && row.uploaderVerified && row.mappingVerified && row.region !== "RESTRICTED_PH" && row.format !== "COMPILATION" && row.videoId === youtubeWatchId(input.sourceUrl.replace("https://www.youtube-nocookie.com/embed/", "https://www.youtube.com/watch?v=")) && row.tmdbId === target.tmdbId && row.mediaType === target.mediaType && (target.mediaType === "movie" || row.season === target.seasonNumber && row.episode === target.episodeNumber));
        if (!approved) throw new Error();
      }
      const provider = await db.playbackProvider.findUnique({ where: { slug: policy.slug } });
      if (!provider?.enabled || provider.type !== policy.type) throw new Error();
      const key = progressKey(target);
      const source = await db.playbackSource.upsert({ where: { providerId_contentKey_sourceUrl: { providerId: provider.id, contentKey: key, sourceUrl: input.sourceUrl } },
        create: { providerId: provider.id, contentKey: key, mediaType: target.mediaType, tmdbId: target.tmdbId, ...(target.mediaType === "tv" ? { seasonNumber: target.seasonNumber, episodeNumber: target.episodeNumber } : {}), sourceUrl: input.sourceUrl, displayLabel: input.displayLabel, priority: input.priority, enabled: false, authorizationVerified: true, authorizationEvidence: input.authorizationEvidence },
        // Re-approval resets verification; it never promotes UNKNOWN to AVAILABLE.
        update: { displayLabel: input.displayLabel, priority: input.priority, enabled: false, authorizationVerified: true, authorizationEvidence: input.authorizationEvidence, availabilityStatus: "UNKNOWN", verificationEvidence: null, lastCheckedAt: null },
      });
      console.log(`Source ${source.id}: approved rights evidence; playback remains UNKNOWN.`);
    } else if (command === "verify") {
      const availability = z.enum(["AVAILABLE", "UNAVAILABLE", "UNKNOWN"]).parse(status);
      if (!argument || !evidence || evidence.trim().length < 20 || availability === "AVAILABLE" && confirmation !== "--played") throw new Error();
      const row = await db.playbackSource.findUnique({ where: { id: argument }, include: { provider: true } });
      const policy = row && providers.get(row.provider.slug);
      if (!row || !policy?.enabled || policy.type !== row.provider.type || !providerAllowsURL(policy, row.sourceUrl) || !row.authorizationVerified || !row.authorizationEvidence) throw new Error();
      if (availability === "AVAILABLE" && policy.slug === "youtube-privacy") {
        const reviews = (JSON.parse(await readFile(new URL("../src/features/playback/data/official-sources.json", import.meta.url),"utf8")) as unknown[]).map(item => officialSourceSchema.parse(item));
        if (!reviews.some(item => officialEmbedReady(item) && item.tmdbId === row.tmdbId && item.mediaType === row.mediaType && (row.mediaType === "movie" || item.season === row.seasonNumber && item.episode === row.episodeNumber) && row.sourceUrl === `https://www.youtube-nocookie.com/embed/${item.videoId}`)) throw new Error();
      }
      await db.playbackSource.update({ where: { id: row.id }, data: { availabilityStatus: availability, enabled: availability === "AVAILABLE", verificationEvidence: evidence, lastCheckedAt: new Date() } });
      console.log(`Manual availability recorded: ${availability}.`);
    } else throw new Error();
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Playback administration failed. Check the development target, reviewed provider policy, input, and manual verification evidence. Connection details and source URLs withheld."); process.exitCode = 1; });
