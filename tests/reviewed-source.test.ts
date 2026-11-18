import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveReviewedSources, type ReviewedSource } from "../src/features/playback/providers/reviewed-source";

// Synthetic mapping only: neither this local demo nor its identity is anime approval.
const fixture: ReviewedSource = {
  id: "review-fixture", providerId: "local-mp4", providerContentId: "fixture-title",
  providerEpisodeId: "fixture-episode", identity: { mediaType: "tv", tmdbId: 42, seasonNumber: 1, episodeNumber: 3 },
  sourceType: "direct", sourceUrl: "/playback/sample.mp4", label: "Synthetic review",
  approval: { status: "Approved", evidenceReference: "fixture-only-rights", freeThirdPartyPlayback: true, philippines: true },
  playback: { status: "AVAILABLE", checkedAt: "2026-11-17T00:00:00Z", evidenceReference: "fixture-only-playback" },
  language: "en", subtitles: ["en"],
};
const target = { mediaId: "tmdb:tv:42", season: 1, episode: 3 };
test("review adapter separates rights, territory, price and actual availability", () => {
  assert.equal(resolveReviewedSources([fixture], target).length, 1);
  for (const patch of [
    { approval: { ...fixture.approval, status: "Needs Verification" } },
    { approval: { ...fixture.approval, status: "Rejected" } },
    { approval: { ...fixture.approval, evidenceReference: " " } },
    { approval: { ...fixture.approval, freeThirdPartyPlayback: false } },
    { approval: { ...fixture.approval, philippines: false } },
    { playback: { ...fixture.playback, status: "UNKNOWN" } },
    { playback: { ...fixture.playback, status: "UNAVAILABLE" } },
    { playback: { ...fixture.playback, checkedAt: null } },
    { playback: { ...fixture.playback, evidenceReference: null } },
  ]) assert.deepEqual(resolveReviewedSources([{ ...fixture, ...patch }], target), []);
});
test("review adapter cannot expand origins, enable providers or substitute an iframe", () => {
  for (const patch of [
    { providerId: "vimeo" }, { providerId: "yenime" }, { providerId: "youtube-privacy" },
    { sourceType: "iframe" }, { sourceUrl: "https://evil.example/video.mp4" },
    { sourceUrl: "https://www.youtube.com/embed/abcdefghijk" },
    { sourceUrl: "/playback/sample.mp4?redirect=https://evil.example" },
    { sourceUrl: "/playback/../sample.mp4" },
  ]) assert.deepEqual(resolveReviewedSources([{ ...fixture, ...patch }], target), []);
  for (const value of [null, {}, { ...fixture, arbitraryURL: "https://evil.example" }])
    assert.deepEqual(resolveReviewedSources([value], target), []);
});
test("review adapter preserves exact episode mapping and omits private review data", () => {
  for (const patch of [{ episode: 2 }, { season: 2 }, { mediaId: "tmdb:tv:43" }, { mediaId: "tmdb:movie:42", season: undefined, episode: undefined }])
    assert.deepEqual(resolveReviewedSources([fixture], { ...target, ...patch }), []);
  const result = JSON.stringify(resolveReviewedSources([fixture], target));
  assert.doesNotMatch(result, /fixture-only|providerEpisodeId|providerContentId|evidenceReference|subtitles/);
  assert.deepEqual(resolveReviewedSources([], target), []);
});
