import { z } from "zod";
/** Reviewed channel identities; never a rule allowing every upload from a channel. */
export const officialProviders = {
  "muse-asia": { name: "Muse Asia", channelUrl: "https://www.youtube.com/@MuseAsia", evidence: "https://www.e-muse.com.tw/cn/social-media/" },
  "muse-philippines": { name: "Muse Philippines", channelUrl: "https://www.youtube.com/@MusePhilippines", evidence: "https://www.e-muse.com.tw/cn/social-media/" },
  "ani-one-asia": { name: "Ani-One Asia", channelUrl: "https://www.youtube.com/@AniOneAsia", evidence: "https://www.medialink.com.hk/en/Anione.aspx" },
  "ani-one-philippines": { name: "Ani-One Philippines", channelUrl: "https://www.youtube.com/@AniOnePhilippines", evidence: "https://www.medialink.com.hk/document/esg2024.pdf" },
  "ani-one-ph-collection": { name: "Ani-One PH Collection", channelUrl: "https://www.youtube.com/@AniOnePHCollection", evidence: "https://www.medialink.com.hk/en/Anione.aspx" },
  "sbs-world": { name: "SBS World", channelUrl: "https://www.youtube.com/@sbsworld", evidence: "https://www.sbsmnc.co.kr/uploaded/board/cream/pdf_4089255979fc40a92056eb71d07512180.pdf" },
  "kbs-world": { name: "KBS WORLD TV", channelUrl: "https://www.youtube.com/@kbsworldtv", evidence: "https://kbsworld.kbs.co.kr/about/kbskorea.php" },
} as const;
export type OfficialProvider = keyof typeof officialProviders;
export const videoId = z.string().regex(/^[A-Za-z0-9_-]{11}$/);
export function youtubeWatchId(value: string) {
  try {
    const url = new URL(value);
    const id = videoId.safeParse(url.searchParams.get("v"));
    return id.success && value === `https://www.youtube.com/watch?v=${id.data}` ? id.data : null;
  } catch { return null; }
}
const code = z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
export const officialSourceSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]{1,100}$/),
  provider: z.enum(Object.keys(officialProviders) as [OfficialProvider, ...OfficialProvider[]]),
  uploaderUrl: z.string(), videoId,
  mediaType: z.enum(["movie", "tv"]), tmdbId: z.number().int().positive(),
  format: z.enum(["MOVIE", "EPISODE", "COMPILATION"]),
  season: z.number().int().min(0).max(9999).nullable(), episode: z.number().int().min(1).max(9999).nullable(),
  title: z.string().trim().min(1).max(200),
  audioLanguage: code.nullable(), subtitles: z.array(code).max(20), durationSeconds: z.number().int().positive().nullable(),
  region: z.enum(["UNKNOWN", "AVAILABLE_PH", "RESTRICTED_PH"]),
  embedding: z.enum(["UNKNOWN", "ALLOWED", "BLOCKED", "UNSUPPORTED"]),
  access: z.enum(["UNKNOWN", "PUBLIC", "MEMBERSHIP", "PAID"]),
  status: z.enum(["UNKNOWN", "WATCH_ON_PROVIDER", "WATCH_ON_BRYXTV"]), enabled: z.boolean(),
  uploaderVerified: z.boolean(), mappingVerified: z.boolean(),
  reviewedAt: z.iso.datetime(), evidence: z.string().trim().min(40).max(6000),
}).strict().superRefine((row, ctx) => {
  if (row.uploaderUrl !== officialProviders[row.provider].channelUrl) ctx.addIssue({code:"custom",message:"Uploader must match reviewed provider."});
  if (row.format === "EPISODE" ? row.mediaType !== "tv" || row.season === null || row.episode === null : row.episode !== null || row.format === "MOVIE" && (row.mediaType !== "movie" || row.season !== null) || row.format === "COMPILATION" && row.mediaType !== "tv") ctx.addIssue({code:"custom",message:"Explicit movie, episode or compilation mapping required."});
  if (row.status === "WATCH_ON_BRYXTV" && (!row.uploaderVerified || !row.mappingVerified || row.format === "COMPILATION" || row.embedding !== "ALLOWED" || row.region !== "AVAILABLE_PH" || row.access !== "PUBLIC")) ctx.addIssue({code:"custom",message:"Internal review requires verified identity, exact mapping, PH availability, public access and embedding."});
  if (row.status === "WATCH_ON_PROVIDER" && (!row.uploaderVerified || !row.mappingVerified || row.embedding === "UNKNOWN")) ctx.addIssue({code:"custom",message:"Provider-only links require reviewed identity, mapping and embed outcome."});
});
export type OfficialSource = z.infer<typeof officialSourceSchema>;
export type ViewingState = "WATCH_ON_BRYXTV" | "WATCH_ON_PROVIDER" | "UNAVAILABLE" | "UNKNOWN";
export function officialMatches(row: OfficialSource, type: "movie" | "tv", id: number, season?: number, episode?: number) {
  return row.enabled && row.mediaType === type && row.tmdbId === id && (episode === undefined || row.format === "EPISODE" && row.season === season && row.episode === episode);
}
export function viewingState(playable: boolean, rows: OfficialSource[], pending = false): ViewingState {
  if (playable) return "WATCH_ON_BRYXTV";
  const enabled = rows.filter(row => row.enabled);
  if (enabled.some(row => row.status === "WATCH_ON_PROVIDER" && row.uploaderVerified && row.mappingVerified && row.embedding !== "UNKNOWN" && row.region !== "RESTRICTED_PH")) return "WATCH_ON_PROVIDER";
  return pending || enabled.some(row => row.region !== "RESTRICTED_PH") ? "UNKNOWN" : "UNAVAILABLE";
}
export function officialWatchUrl(row: OfficialSource) { return `https://www.youtube.com/watch?v=${videoId.parse(row.videoId)}`; }
/** Separate from URL syntax: internal YouTube playback requires all review checks. */
export function officialEmbedReady(row: OfficialSource) {
  return row.status === "WATCH_ON_BRYXTV" && row.enabled && row.uploaderVerified && row.mappingVerified && row.format !== "COMPILATION" && row.embedding === "ALLOWED" && row.region === "AVAILABLE_PH" && row.access === "PUBLIC";
}
export const officialManifestSchema = z.array(officialSourceSchema).superRefine((rows, ctx) => {
  const keys = new Set<string>(), videos = new Set<string>(), episodes = new Set<string>();
  for (const row of rows) {
    if (keys.has(row.key) || videos.has(row.videoId)) ctx.addIssue({code:"custom",message:"A video must have one explicit mapping; compilations cannot become multiple episodes."});
    const mapping = `${row.mediaType}:${row.tmdbId}:${row.season}:${row.episode}`;
    if (row.format === "EPISODE" && episodes.has(mapping)) ctx.addIssue({code:"custom",message:"Duplicate episode mapping: review the existing source before registering an alternative."});
    if (row.format === "EPISODE") episodes.add(mapping);
    keys.add(row.key); videos.add(row.videoId);
  }
});
