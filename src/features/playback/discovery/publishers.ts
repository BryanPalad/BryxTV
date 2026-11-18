import {
  officialProviders,
  type OfficialProvider,
} from "../providers/official-policy";
export interface DiscoveryPublisher {
  slug: OfficialProvider;
  name: string;
  type: "anime" | "kdrama";
  channelId: string;
  evidence: string;
}
/** Pinned channel candidates tied to reviewed corporate handles; the API must cross-check customUrl at runtime. */
export const discoveryPublishers: DiscoveryPublisher[] = [
  {
    slug: "muse-asia",
    name: officialProviders["muse-asia"].name,
    type: "anime",
    channelId: "UCGbshtvS9t-8CW11W7TooQg",
    evidence: officialProviders["muse-asia"].evidence,
  },
  {
    slug: "muse-philippines",
    name: officialProviders["muse-philippines"].name,
    type: "anime",
    channelId: "UC6sKhWSlPSWIh6e4ukisDHQ",
    evidence: officialProviders["muse-philippines"].evidence,
  },
  {
    slug: "ani-one-asia",
    name: officialProviders["ani-one-asia"].name,
    type: "anime",
    channelId: "UC0wNSTMWIL3qaorLx0jie6A",
    evidence: officialProviders["ani-one-asia"].evidence,
  },
  {
    slug: "ani-one-philippines",
    name: officialProviders["ani-one-philippines"].name,
    type: "anime",
    channelId: "UCZGEjiTMwMv-Mf-t3VLBlJQ",
    evidence: officialProviders["ani-one-philippines"].evidence,
  },
  {
    slug: "kbs-world",
    name: officialProviders["kbs-world"].name,
    type: "kdrama",
    channelId: "UC5BMQOsAB8hKUyHu9KI6yig",
    evidence: officialProviders["kbs-world"].evidence,
  },
];
