import { providerEligible } from "../src/features/playback/providers/eligibility";
import nextEnv from "@next/env";
import {
  officialProviders,
  youtubeWatchId,
  type OfficialProvider,
} from "../src/features/playback/providers/official-policy";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
// These exact channel identities were checked on the native publisher pages.
const channels: Partial<Record<OfficialProvider, string>> = {
  "muse-asia": "UCGbshtvS9t-8CW11W7TooQg",
  "muse-philippines": "UC6sKhWSlPSWIh6e4ukisDHQ",
  "kbs-world": "UC5BMQOsAB8hKUyHu9KI6yig",
};
async function main() {
  if (!providerEligible("youtube-privacy")) throw new Error("YouTube discovery is inactive under the current provider policy.");
  const [provider, url] = process.argv.slice(2);
  if (
    !provider ||
    !Object.hasOwn(officialProviders, provider) ||
    !url ||
    !youtubeWatchId(url)
  )
    throw new Error();
  const identity = provider as OfficialProvider,
    id = youtubeWatchId(url)!;
  if (!process.env.YOUTUBE_API_KEY) {
    console.log(
      JSON.stringify(
        {
          candidateOnly: true,
          provider,
          videoId: id,
          url,
          channel: officialProviders[identity].channelUrl,
          manualReviewRequired: [
            "Open the canonical video and verify the publisher handle and verification badge",
            "Confirm complete content, duration, subtitles and exact TMDB season/episode",
            "Record Philippines distribution evidence",
            "Test playback, seek and fullscreen in disabled BryxTV preview",
            "Register review using playback:manage official-add; never infer approval",
          ],
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!channels[identity]) throw new Error();
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("part", "snippet,contentDetails,status");
  endpoint.searchParams.set("id", id);
  // API key stays in the request header; never print request or provider error bodies.
  const response = await fetch(endpoint, {
    headers: { "X-Goog-Api-Key": process.env.YOUTUBE_API_KEY },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error();
  const payload = await response.json();
  const item = payload.items?.find((item: { id: string }) => item.id === id);
  if (!item || item.snippet?.channelId !== channels[identity])
    throw new Error();
  console.log(
    JSON.stringify(
      {
        candidateOnly: true,
        provider,
        videoId: id,
        url,
        channelId: item.snippet.channelId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        durationISO8601: item.contentDetails?.duration,
        captionFlag: item.contentDetails?.caption,
        regionRestrictions: item.contentDetails?.regionRestriction ?? null,
        embeddable: item.status?.embeddable,
        privacyStatus: item.status?.privacyStatus,
        reviewedAt: new Date().toISOString(),
        warning:
          "API signals do not establish full-episode identity, subtitle language, actual playback, payment status or final approval. Complete manual review.",
      },
      null,
      2,
    ),
  );
}
main().catch(() => {
  console.error(
    "Discovery failed: check canonical URL, supported publisher identity, API configuration or quota. No source was saved or approved; provider details withheld.",
  );
  process.exitCode = 1;
});
