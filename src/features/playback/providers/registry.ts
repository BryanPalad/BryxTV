/** Code-reviewed policy. Database rows cannot expand hostnames or capabilities. */
export type SourceType = "VIDEOJS_MP4" | "VIDEOJS_HLS" | "EXTERNAL_EMBED";
export interface ProviderDefinition {
  slug: string;
  name: string;
  type: SourceType;
  enabled: boolean;
  allowedHostnames: readonly string[];
  fullscreen: boolean;
  progressTracking: "videojs" | "unsupported";
  availabilityCheck: "manual";
  validateURL: (url: string) => boolean;
}
function localMedia(value: string, extension: string) {
  return new RegExp(`^/playback/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\\.${extension}$`).test(value);
}
export function validYouTubeEmbed(value: string) {
  try {
    const url = new URL(value);
    return value === url.href && url.protocol === "https:" && url.hostname === "www.youtube-nocookie.com" && !url.port && !url.username && !url.password && !url.hash && !url.search && /^\/embed\/[a-zA-Z0-9_-]{11}$/.test(url.pathname);
  } catch { return false; }
}
/** Only the rights-reviewed full film is permitted, not arbitrary Archive items. */
export function validArchiveEmbed(value: string) {
  return value === "https://archive.org/embed/valkaama";
}
export function providerAllowsURL(provider: ProviderDefinition, value: string) {
  if (!provider.validateURL(value)) return false;
  if (!provider.allowedHostnames.length) return provider.type !== "EXTERNAL_EMBED" && value.startsWith("/playback/");
  try {
    const url = new URL(value);
    return value === url.href && url.protocol === "https:" && provider.allowedHostnames.includes(url.hostname) && !url.port && !url.username && !url.password && !url.hash && !url.search;
  } catch { return false; }
}
export function defineRegistry(entries: readonly ProviderDefinition[]) {
  const registry = new Map<string, ProviderDefinition>();
  for (const entry of entries) {
    if (!/^[a-z0-9-]+$/.test(entry.slug) || registry.has(entry.slug) || entry.type === "EXTERNAL_EMBED" && !entry.allowedHostnames.length) throw new Error("Invalid or duplicate playback provider.");
    if (entry.allowedHostnames.some(host => !/^[a-z0-9.-]+$/.test(host) || host.includes("..") || !host.includes("."))) throw new Error("Provider hostnames must be exact domains.");
    registry.set(entry.slug, Object.freeze(entry));
  }
  return registry as ReadonlyMap<string, ProviderDefinition>;
}
export const providers = defineRegistry([
  { slug: "internet-archive", name: "Internet Archive", type: "EXTERNAL_EMBED", enabled: true, allowedHostnames: ["archive.org"], fullscreen: true, progressTracking: "unsupported", availabilityCheck: "manual", validateURL: validArchiveEmbed },
  { slug: "local-mp4", name: "BryxTV MP4", type: "VIDEOJS_MP4", enabled: true, allowedHostnames: [], fullscreen: true, progressTracking: "videojs", availabilityCheck: "manual", validateURL: value => localMedia(value, "mp4") },
  { slug: "local-hls", name: "BryxTV HLS", type: "VIDEOJS_HLS", enabled: true, allowedHostnames: [], fullscreen: true, progressTracking: "videojs", availabilityCheck: "manual", validateURL: value => localMedia(value, "m3u8") },
  // URL policy is ready; no film is approved merely because it is on YouTube.
  { slug: "youtube-privacy", name: "YouTube", type: "EXTERNAL_EMBED", enabled: true, allowedHostnames: ["www.youtube-nocookie.com"], fullscreen: true, progressTracking: "unsupported", availabilityCheck: "manual", validateURL: validYouTubeEmbed },
]);
export const playbackFrameOrigins = [...new Set([...providers.values()].filter(p => p.enabled && p.type === "EXTERNAL_EMBED").flatMap(p => p.allowedHostnames.map(host => `https://${host}`)))];

export const playbackMediaOrigins = [...new Set([...providers.values()].filter(p => p.enabled && p.type !== "EXTERNAL_EMBED").flatMap(p => p.allowedHostnames.map(host => `https://${host}`)))];
