import { test } from "node:test";
import assert from "node:assert/strict";
import { verifiedCatalogTitleIds } from "../src/features/playback/providers/watchable-catalog";
const row = {
  id: "test",
  contentKey: "tv:63926:3:1",
  sourceUrl: "https://www.youtube-nocookie.com/embed/t7KlZ38p39w",
  displayLabel: "Episode",
  priority: 10,
  enabled: true,
  authorizationVerified: true,
  authorizationEvidence: "Reviewed rights",
  availabilityStatus: "AVAILABLE",
  verificationEvidence: "Actual playback reviewed",
  lastCheckedAt: new Date(),
  provider: { slug: "youtube-privacy", type: "EXTERNAL_EMBED", enabled: true },
  mediaType: "tv",
  tmdbId: 63926,
  seasonNumber: 3,
  episodeNumber: 1,
};
test("watchable rows require current DB approval AND exact official manifest mapping", () => {
  assert.deepEqual(verifiedCatalogTitleIds([row, row]), [63926]);
  for (const patch of [
    { enabled: false },
    { authorizationVerified: false },
    { authorizationEvidence: null },
    { verificationEvidence: null },
    { lastCheckedAt: null },
    { availabilityStatus: "UNKNOWN" },
    { availabilityStatus: "UNAVAILABLE" },
    { sourceUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk" },
    { episodeNumber: 2 },
    { mediaType: "movie" },
    { provider: { ...row.provider, enabled: false } },
  ])
    assert.deepEqual(verifiedCatalogTitleIds([{ ...row, ...patch }]), []);
});
