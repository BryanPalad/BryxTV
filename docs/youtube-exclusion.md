# Phase 6.2.3 — YouTube exclusion and effective availability

Completed 2026-11-04 (Asia/Manila). This phase implements the exclusion proposed in `non-youtube-provider-feasibility.md`. No replacement provider was added.

## Effective policy

`src/features/playback/providers/eligibility.ts` is the central product policy. YouTube provider identifiers and YouTube, youtube-nocookie, youtu.be, googlevideo and ytimg host families are excluded. Existing registry hostname/path/type/HTTPS checks still apply; the eligibility policy does not grant access to arbitrary other hosts.

The historical YouTube registry entry is retained but disabled. `providerAllowsURL` applies the policy, so `approvedPolicy`, source resolution, per-title availability, watchable rows, resumability and development previews reject excluded sources. Database AVAILABLE status and historical approval cannot override current eligibility. Existing direct watch URLs return the unavailable experience. API results remain private/no-store. CSP no longer includes the YouTube frame origin.

Official manifest records and validation remain intact for historical evidence. Public manifest lookup, viewing states, provider-only links and channel directories filter excluded sources. YouTube trailers have a separate component and are now gated too. No YouTube fallback or replacement provider is enabled.

The client source selector revalidates registry eligibility, URLs and types before mounting a player. A stale preferred source or session-storage selection cannot select a YouTube source; an eligible alternative for the same target can still be selected. The iframe component retains its existing sandbox and exact-URL checks.

## User-visible behavior

- Excluded episodes display “This episode is currently unavailable”, episode metadata and a **Back to Episodes** action; no Video.js or iframe is mounted.
- YouTube-only titles disappear from approved-only Watchable Anime/K-Drama rows. Empty rows hide normally. Trending Anime, Popular K-Dramas, search and metadata detail pages remain.
- Eligible non-YouTube approved sources still produce WATCH_ON_BRYXTV. Excluded historical candidates do not incorrectly produce UNKNOWN. Incomplete eligible sources can still produce UNKNOWN.
- No current non-YouTube provider-only destination is registered. Historical YouTube provider-only records no longer create external actions. A future destination requires independent approval; none is fabricated here.
- Previous/Next follows the same metadata adjacency and labels unavailable neighbors rather than skipping them. Season/episode browsing remains intact.
- Continue Watching now retains unfinished records even when their source becomes unavailable. Cards show saved progress and link to details instead of a broken watch URL. History remains owner-scoped; no progress deletion or reset was introduced.
- Authentication, My List, source ownership checks and actual player progress behavior are unchanged.

## Remaining delivery

The existing licensed Big Buck Bunny MP4/HLS demo excerpts remain playable. Internet Archive remains a narrowly allowlisted provider, but Valkaama's existing source stays disabled and UNKNOWN; it was not enabled or retested. No popular anime/K-drama full episode currently qualifies for public internal playback after YouTube exclusion.

## Discovery status

Live `content:discover` and `playback:discover` are blocked by the product policy before external requests. No YouTube key was added and normal application operation does not require one. README, environment example and bulk-discovery documentation mark the workflow inactive. Existing code, candidate reports and review records are preserved. Automated fixture tests use synthetic, network-free discovery and isolated disposable output directories; no live discovery was run.

## Modified files in this phase

Paths below are repository-relative. Other already-uncommitted Phase 6.2.1 work remains in the tree and is not claimed as newly implemented here.

| Files | Change |
| --- | --- |
| `src/features/playback/providers/eligibility.ts` | New centralized exclusion policy |
| `src/features/playback/providers/registry.ts` | URL enforcement, retained disabled YouTube entry, eligible CSP origins |
| `src/features/playback/providers/official-policy.ts` | Separate historical review from current public eligibility |
| `src/features/playback/providers/official-sources.server.ts` | Public manifest filtering |
| `src/features/playback/components/official-viewing.tsx`, `official-channels.tsx` | Remove excluded viewing actions and channel destinations |
| `src/features/playback/components/source-selector.tsx` | Recheck options before player mounting and preference selection |
| `src/features/playback/components/watch-page.tsx` | Unavailable messaging and Back to Episodes |
| `src/features/catalog/components/trailer-player.tsx` | Block separate YouTube trailer player |
| `src/features/history/server.ts` | Retain unavailable unfinished history and present details links |
| `src/app/credits/page.tsx`, `README.md`, `.env.example`, `docs/bulk-discovery.md` | Explain inactive YouTube behavior/discovery |
| `scripts/content-discover.ts`, `scripts/discover-official-video.ts` | Block live discovery |
| `tests/provider-exclusion.test.ts` | New isolated resolver/API/history/alias/preview tests |
| `tests/playback-providers.test.ts`, `tests/official-sources.test.ts`, `tests/watchable-catalog.test.ts`, `tests/episode-navigation.test.ts` | Policy, catalog, historical-review and navigation expectations |
| `tests/ui/playback-sources.test.tsx`, `tests/ui/official-viewing.test.tsx`, `tests/ui/history.test.tsx` | Selector/trailer/iframe exclusion, unavailable cards, fixture fullscreen regressions |
| `tests/discovery.integration.test.ts` | Expect inactive live-discovery failure; retain fixture regression coverage |
| `tests/auth.integration.test.ts`, `tests/history.integration.test.ts`, `tests/watchlist.integration.test.ts` | Verify both development URLs before live fixtures; update Continue Watching expectations |
| `tests/playback-providers.integration.test.ts` | Live exclusion and retained non-YouTube/source/history checks |
| `docs/youtube-exclusion.md` | This implementation and validation report |

No direct edits were needed in the resolver, development-preview handler, watchable ranking or episode navigation implementation: their shared policy calls enforce exclusion. The already-uncommitted history test import/lifecycle fix is preserved, with additional coverage added around it.

## Database safety and validation

Both pooled and direct connections were verified using read-only `neon.branch_id` checks against **br-raspy-sun-az80iq7r** before live tests, and verified again afterward. The six pre-existing playback sources, including associated provider metadata and approval history, matched a before/after SHA-256 snapshot. Source IDs, approval states and episode mappings were not changed.

No migrations, production operations, new dependencies, commits, pushes or PRs. Live tests used disposable development users/sources and cleaned up their own fixtures. Existing user records were not targeted. The database safety checks added to integration tests run before those tests access application records.

| Check | Result |
| --- | --- |
| ESLint | Passed; no warnings |
| TypeScript (`next typegen && tsc --noEmit`) | Passed |
| Prisma schema validation | Passed with connection variables blank |
| Offline core/fixture integration tests | 81 passed, 0 failed; 6 opt-in live tests skipped |
| UI tests | 20 passed, 0 failed |
| Live auth/history/playback/watchlist tests | All 10 tests passed across the initial run and isolated watchlist rerun; 0 skipped |
| Production build | Passed, using blank database/auth/API variables to avoid live build dependencies |
| Whitespace | `git diff --check` passed |

The first combined live run had 9 passes and one watchlist failure caused by the normal authentication rate limit (HTTP 429) after repeated disposable signups. The isolated watchlist rerun passed after the rate-limit window. No authentication protection was weakened. Do not interpret the initial combined run as wholly passing.

## Browser verification and remaining manual checks

Verified against a local production build on port 3001:

- Direct One-Punch Man S3E1 watch URL: episode title/description retained, unavailable message and Back to Episodes visible, zero iframe/video elements.
- Back to Episodes navigates to the matching season and episode section; all 12 season cards remain, with no YouTube destinations.
- Responsive unavailable view checked at observed desktop width 985 CSS px and mobile width 390 CSS px. No horizontal overflow at those sizes. Mobile screenshot: `/tmp/bryxtv-exclusion-mobile.png`.
- Search still returns One-Punch Man's detail link.
- Homepage retains Trending Anime and Popular K-Dramas; both empty Watchable rows are absent.
- MP4 demo Play changes to Pause and playback reaches the ten-second end with no media error.

Fullscreen state did not activate in the in-app browser after clicking the demo's fullscreen control. Therefore native fullscreen is **not newly manually verified**; existing fullscreen UI regression tests pass, and its implementation was not changed. Check Chrome/Safari and a physical mobile browser manually. HLS live decoding, actual Google OAuth and a signed-in browser walkthrough were not repeated; automated authenticated persistence/ownership tests passed.

Suggested manual review: sign in, confirm My List remains intact, inspect an unavailable saved episode's progress/details link, try both local demos with seek/captions/fullscreen, and recheck direct YouTube-only watch URLs and preview IDs. No test should re-enable a historical source.

## Recommended next phase

Keep discovery accurate and improve verified official external destinations only where permitted by the zero-fee policy. Reopen internal provider integration only after obtaining evidence of authorized, non-YouTube, zero-fee Philippines playback. No replacement source is implied by this phase.
