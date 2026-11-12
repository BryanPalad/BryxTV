/** Current product policy, independent of historical source approval. */
const excludedHosts = ["youtube.com", "youtube-nocookie.com", "youtu.be", "googlevideo.com", "ytimg.com"];
export function providerEligible(slug: string, sourceUrl?: string): boolean {
  if (/youtube/i.test(slug)) return false;
  if (!sourceUrl || sourceUrl.startsWith("/playback/")) return true;
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase();
    return !excludedHosts.some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch { return false; }
}
