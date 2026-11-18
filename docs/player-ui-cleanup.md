# Phase 6.0.3 — embedded player UI cleanup

Implemented and verified on 2026-10-24 using the existing Valkaama development preview.
No playback source was enabled or approved.

## UI improvements and before/after

Previously, large watch-page top padding and a back-link margin preceded the title,
verification notice, long source selector, repeated verification text, iframe, loaded
status, Reload and Fullscreen toolbar, and resume explanation. On small screens those
messages pushed the film well below the title.

The hierarchy is now a compact watch-only header, back link/title/episode heading,
player, source choice or provider name, collapsed playback help, collapsed development
verification (preview only), rights attribution, metadata and related content. Existing
homepage/category layouts are unaffected. A watch-specific wrapper scopes header and
spacing changes. The header is in normal flow rather than sticky over the video.

The player begins around 166px from the page top on phone widths, with no technical
notice above it. The existing normal 16:9 frame and fullscreen styles remain intact.
Landscape pages can scroll; the header cannot cover the controls.

## Controls removed or relocated

- Removed the duplicate BryxTV Fullscreen action for Internet Archive. Its own tested
  fullscreen and exit controls remain the primary controls; no iframe DOM was changed.
- Replaced the permanent Reload toolbar with Retry player in collapsed Playback options.
  A detected load failure/timeout also exposes Retry directly, without duplicate retries.
- Removed the persistent Player loaded paragraph and public manually-verified-source text.
- Moved unsupported exact-resume information into Playback options.
- Moved source switching below the video. A single source shows its readable provider
  name instead of a redundant dropdown. Multiple sources use short provider labels,
  disambiguated when necessary, with the selected full label available to assistive
  technology and full option labels available through title attributes.
- Development preview/UNKNOWN/disabled explanations live only inside a separate,
  collapsed Development verification disclosure, rendered solely for the existing
  server-authorized preview. No internal IDs or approval commands are displayed.
- Retained the existing fullscreen fallback and exit behavior for other reviewed iframe
  providers inside Playback options. Failed fullscreen requests remain separate from
  playback errors. No fallback overlays intercept Archive controls.

## Files modified

1. `src/features/playback/components/watch-page.tsx`: scoped watch layout, removed above-player preview notice.
2. `src/features/playback/components/source-selector.tsx`: below-player compact choice, single-provider label, collapsed preview details.
3. `src/features/playback/components/embedded-player.tsx`: compact loading/recovery/help, native Archive fullscreen, source-picker slot.
4. `src/app/globals.css`: watch-only spacing/header rules, touch/focus/safe-area styles, compact disclosures.
5. `tests/ui/playback-sources.test.tsx`: revised UI expectations and additional cleanup coverage.
6. `docs/player-ui-cleanup.md`: this implementation and verification record.

No Video.js, progress-hook, authentication, watchlist, provider URL policy, public source
resolver, preview authorization, CSP, database model or migration changes were made.

## Responsive browser measurements

Measurements use the browser's requested viewport; content width excludes its vertical
scrollbar. Every measured frame retained 16:9 and every page had zero horizontal overflow.

| Requested viewport | Frame width × height | Frame top |
| --- | --- | --- |
| 375 × 812 | 336 × 189 | 165.77px |
| 390 × 844 | 351 × 197.44 | 165.77px |
| 430 × 932 | 391 × 219.94 | 165.77px |
| 768 × 1024 | 706.94 × 397.64 | 182.50px |
| 1440 × 900 | 1200 × 675 | 196.47px |
| 844 × 390 landscape | 778.38 × 437.83 | 185.11px |

The header is 64px tall in these layouts. Safe-area-aware page gutters, 44px disclosure
and retry targets, visible blue keyboard focus, accessible iframe titles, native select
controls and semantic details/summary disclosures are preserved. The player is not
covered by fixed BryxTV navigation or extra Archive fullscreen overlays.

## Playback and fullscreen verification

Used the existing authenticated localhost development preview for movie 74890. Internet
Archive's actual iframe loaded. Clicking its real Play button produced film credits and
its visible elapsed clock advanced to 00:20 and beyond. Its native seek slider moved to
later playback (00:25 and 00:52 observed), and playback continued to approximately 00:55.
Only legitimate user controls were used; no cross-origin scripts, CSS changes, fake
controls, click interception, timestamp adapter or media download was introduced.

Archive's native desktop Fullscreen control entered fullscreen with the parent iframe at
(0,0), 1280 × 720, matching the reported viewport. Its own Exit Fullscreen control worked;
zero fullscreen elements remained and the restored frame ratio was approximately 1.7778.
The single-source dropdown and duplicate BryxTV fullscreen button were absent. Playback
options expanded normally to reveal Retry player and exact-resume information.

Multiple-source switching, session preference, explicit preferred source, readable labels,
iframe attributes and reload behavior passed UI tests using synthetic reviewed URL fixtures.
Those fixtures are never claimed as real licensed playback. There is only one real approved
rights candidate registered for this film, so actual switching between two licensed remote
sources was not browser-tested. The existing public unavailable/guest-preview checks still
returned no iframe and an unavailable message.

Phone/tablet testing used viewport emulation, not physical devices. This phase does not
claim physical mobile fullscreen verification. User-reported successful mobile playback
was not used as automatic approval or as a substitute for the remaining checklist.

## Regression and automated checks

- ESLint: passed.
- Strict TypeScript: passed.
- Offline suite: 48 core tests passed, four optional live suites skipped; 14 UI tests passed.
- Separate live development run: all four suites passed, eight tests including auth subtests.
  These cover Better Auth sessions/logout, My List ownership/persistence, viewing history,
  source policy and tracking-capable Continue Watching behavior.
- Video.js MP4/HLS code is unchanged. Existing player/progress tests and live source/history
  regressions passed, including resume/restoration, pause writes, completion, preserved
  progress and Continue Watching. The 12-second save interval and restart code were untouched.
- Production build: passed with external credentials explicitly blank; all routes generated successfully.
- Diff whitespace check: passed.

Google regressions use supported automated fixtures; a new human Google consent flow was
not performed. Physical-device MP4/HLS/fullscreen checks remain manual.

## Security and database status

Both DATABASE_URL and DIRECT_URL independently reported the required Neon development
branch `br-raspy-sun-az80iq7r` before disposable test-account creation. Read-only checks
confirmed Valkaama source `cmvl2hp6x0000edsb4r2a9mqi` remains `enabled=false`,
`availabilityStatus=UNKNOWN`, `lastCheckedAt=null`. The public API returned no playable
sources and guest preview access rendered no iframe. The preview account accumulated zero
viewing-progress rows from the embed. Temporary test accounts/fixtures were removed by
exact identity; existing users and the registered film/provider were retained.

No production access/write, migration, new provider, dependency, paid service, media storage,
commit or push was introduced. Sandbox and allow permissions were preserved verbatim.

## Remaining manual verification

1. Sign in on localhost and open the existing Valkaama development preview.
2. Check portrait/landscape on physical iPhone, Android and tablet devices, including safe
   areas, native fullscreen entry/exit and visible provider controls.
3. Use Playback options → Retry player if remote playback fails; confirm recovery and
   keyboard focus. Expand Development verification only when reviewing approval status.
4. Where multiple real approved sources exist, switch, refresh and confirm source preference.
5. Complete the original sustained/full-length playback checklist before any separate,
   explicit approval. This phase intentionally leaves Valkaama disabled and UNKNOWN.
