import { officialProviders } from "../src/features/playback/providers/official-policy";
import type { DiscoveryVideo } from "../src/features/playback/discovery/types";
import type { DiscoveryPublisher } from "../src/features/playback/discovery/publishers";
/** Explicit fixture mode only; never falls through to a network request. */
export function fixtureTransport(
  videos: DiscoveryVideo[],
  publishers: DiscoveryPublisher[],
): typeof fetch {
  return async (input) => {
    const url = new URL(String(input));
    if (url.origin !== "https://www.googleapis.com")
      throw new Error("Fixture attempted unexpected origin.");
    const endpoint = url.pathname.split("/").at(-1),
      channel =
        url.searchParams.get("channelId") ?? url.searchParams.get("id") ?? "",
      publisher = publishers.find((p) => p.channelId === channel);
    if (endpoint === "channels")
      return Response.json({
        items: publisher
          ? [
              {
                id: channel,
                snippet: {
                  customUrl: officialProviders[publisher.slug].channelUrl
                    .split("/")
                    .at(-1),
                },
                contentDetails: {
                  relatedPlaylists: { uploads: `UU${channel.slice(2)}` },
                },
              },
            ]
          : [],
      });
    if (endpoint === "playlists") {
      const id = url.searchParams.get("id");
      if (id) {
        const owner = publishers.find(
          (p) =>
            id === `UU${p.channelId.slice(2)}` ||
            id === `PL${p.channelId.slice(2)}`,
        );
        return Response.json({
          items: owner
            ? [
                {
                  id,
                  snippet: {
                    channelId: owner.channelId,
                    title: "Fixture collection",
                  },
                },
              ]
            : [],
        });
      }
      return Response.json({
        items: publisher
          ? [
              {
                id: `PL${publisher.channelId.slice(2)}`,
                snippet: {
                  channelId: channel,
                  title:
                    publisher.type === "anime"
                      ? "Fixture Anime"
                      : "Fixture Drama",
                },
              },
            ]
          : [],
      });
    }
    if (endpoint === "playlistItems") {
      const playlist = url.searchParams.get("playlistId"),
        owner = publishers.find(
          (p) =>
            playlist === `UU${p.channelId.slice(2)}` ||
            playlist === `PL${p.channelId.slice(2)}`,
        ),
        rows = videos.filter((v) => v.channelId === owner?.channelId),
        start = url.searchParams.get("pageToken") === "second" ? 3 : 0;
      return Response.json({
        items: rows
          .slice(start, start === 0 ? 3 : rows.length)
          .map((row) => ({ contentDetails: { videoId: row.id } })),
        ...(start === 0 && rows.length > 3 ? { nextPageToken: "second" } : {}),
      });
    }
    if (endpoint === "videos")
      return Response.json({
        items: videos
          .filter((v) =>
            (url.searchParams.get("id") ?? "").split(",").includes(v.id),
          )
          .map((v) => ({
            id: v.id,
            snippet: {
              channelId: v.channelId,
              title: v.title,
              description: v.description,
              publishedAt: v.publishedAt,
            },
            contentDetails: {
              duration:
                v.durationSeconds === null
                  ? undefined
                  : `PT${v.durationSeconds}S`,
              caption: String(v.captionFlag ?? false),
              ...(v.allowedRegions || v.blockedRegions
                ? {
                    regionRestriction: {
                      ...(v.allowedRegions
                        ? { allowed: v.allowedRegions }
                        : {}),
                      ...(v.blockedRegions
                        ? { blocked: v.blockedRegions }
                        : {}),
                    },
                  }
                : {}),
            },
            status: {
              embeddable: v.embeddable,
              privacyStatus: v.public ? "public" : "private",
            },
          })),
      });
    throw new Error("Unsupported fixture endpoint.");
  };
}
