# Phase 6.2 — Content expansion and episode navigation

Development review: 2026-10-24. Source approvals are individual manual reviews, not a channel-wide license or a promise of permanent access.

## Implemented

- Previous Episode, Next Episode and Back to Episode List on TV watch pages. Neighbors follow TMDB ordering, not source availability. Regular-season boundaries are supported; specials remain separate. An unavailable immediate neighbor is never silently skipped. Provider-only neighbors use an explicitly labeled external link. Missing metadata fails closed.
- Watchable Anime and Watchable K-Dramas use current database enablement/availability, authorization evidence, verification timestamp, provider policy, exact canonical episode identity and official manifest review. Metadata-only titles cannot populate these rows. Empty rows are omitted. Cards lead to series details to choose an approved episode.
- Episode descriptions are limited to three lines; compact episode availability now omits duplicated source-review panels while retaining safe provider links; existing posters, synopsis, genres, season selector, runtime, status and authenticated My List actions are retained.
- Manifest registration rejects duplicate video IDs AND duplicate episode mappings. An alternative upload cannot silently replace or duplicate an existing reviewed episode. Existing reviews were retained.
- `playback:discover` supports a one-video official YouTube Data API lookup, with no automatic save/approval. Without the optional server-only `YOUTUBE_API_KEY`, it prints the canonical publisher and manual review checklist instead. API lookup currently supports the independently checked Muse Asia, Muse Philippines and KBS WORLD TV channel IDs; other directory entries require manual review. No channel crawling or search quota consumption.
- `playback:manage official-audit` validates uniqueness and compares local reviews with development source availability and verification timestamps. `official-review` displays private evidence locally. No public administration endpoint.

## Registered content and counts

| Title | Episode | Official publisher / video | Review result |
|---|---|---|---|
| One-Punch Man | S3E1 | Muse Asia / `t7KlZ38p39w` | Existing approved episode, retained |
| One-Punch Man | S3E2, Monster Traits | Muse Philippines / `gew-sOx4oyA` | **New approved episode** |
| Attack on Titan | S1E1, To You, in 2000 Years: The Fall of Shiganshina (1) | Muse Philippines / `eGjGTYyq41c` | **New approved episode and title** |
| Sirius (2013) | S1E1 | KBS WORLD TV / `lli3-LcEfMU` | **New UNKNOWN candidate, database disabled** |
| If We Were a Season | Standalone 2017 special, TMDB movie 640828 | KBS WORLD TV / `vZ7EMIH0oHw` | Existing UNKNOWN retained |
| The Healer Who Was Banished from His Party | S1 compilation, not independent episodes | Ani-One PH Collection / `dBdEWgtknLM` | Existing provider-only compilation retained |

Totals: **3 approved playable episodes (2 new)**; **0 provider-only individual episodes**; **1 provider-only compilation**; **2 registered UNKNOWN candidates (1 new)**. No complete new season was verified. Valkaama remains disabled UNKNOWN and excluded from normal catalog discovery; it is not included in these content counts.

Additional discovery leads, not registered or approved: Muse Asia's alternate One-Punch Man S3E2 `PLIAsgLjkOc` (same episode, would duplicate mapping); Muse Philippines S3E3 `JZuutBN0UQY`; TMDB What Happens to My Family? (2014), TV 70525. No availability claims for Demon Slayer, Jujutsu Kaisen or Solo Leveling.

## Source evidence and browser results

### Muse Philippines

- Exact verified channel: `@MusePhilippines`, channel `UC6sKhWSlPSWIh6e4ukisDHQ`. Corporate channel directory: [Muse official social media](https://www.e-muse.com.tw/cn/social-media/).
- [One-Punch Man S3E2 official release](https://www.youtube.com/watch?v=gew-sOx4oyA): publisher title explicitly says absolute Episode 26 / Season 3 EP02; description names Monster Traits. TMDB TV63926 S3E2 / episode6532160 agrees. Native player duration 24:02. BryxTV preview advanced to 0:22; twelve native +10-second actions sought to 2:22; resumed moving story with visible English burned-in subtitles. Native desktop iframe fullscreen measured 1280×720 at (0,0); exit restored the normal player.
- [Attack on Titan S1E1 official release](https://www.youtube.com/watch?v=eGjGTYyq41c): full Episode 01, English Full Episode Playlist linked in the description. TMDB TV1429 S1E1 / episode65480 agrees; Shiganshina story visually observed. Provider duration 25:39 versus TMDB's rounded 24-minute runtime; no artificial boundaries inferred. Preview advanced to 0:29, sought to 2:29 and 4:48, then resumed to 4:49 with visible English burned-in subtitles. Native desktop fullscreen and exit passed at 1280×720.
- Both exact release descriptions advertise anime streaming on Muse Philippines for Filipino viewers, providing publisher-specific Philippines distribution evidence, corroborated by public playback in the local review browser. No VPN or region override was used. Independent IP geolocation was not measured; this is not a nationwide or permanent access guarantee. Neither source requested membership/payment. Audio language is left unverified, rather than guessed.
- These are sampled playback/seek tests, not claims of watching each episode end to end. Provider advertisements, branding and restrictions remain intact.

### KBS WORLD TV

- [KBS's own Sirius VOD directory](https://kbsworld.kbs.co.kr/program/view.php?pg_seq=916) explicitly links episodes 1–4 and dates. This verifies the uploader and series identity without relying on search snippets.
- [Sirius Episode 1](https://www.youtube.com/watch?v=lli3-LcEfMU): verified `@kbsworldtv`, channel `UC5BMQOsAB8hKUyHu9KI6yig`. TMDB TV72165 S1E1 aired 2013-01-06, matching the publisher's title and VOD listing. Provider duration 1:12:18; TMDB runtime is 69 minutes.
- Disabled authenticated BryxTV preview played to 0:39, sought to 1:39 and resumed moving episode content at 1:41. Native desktop fullscreen and exit passed at 1280×720. Embedding is recorded ALLOWED, but **Philippines distribution remains UNKNOWN**, so no public Play action or Watchable K-Dramas row is exposed. English subtitles remain publisher-declared `[ENG]`; the sampled scene did not independently establish English dialogue subtitles.
- General broadcaster reach and successful browser playback are not substituted for title-specific regional evidence. No new K-drama episode is approved in this phase.

## Repeatable review workflow

1. Choose an official video via native publisher pages or a broadcaster's own VOD directory.
2. Run `npm run playback:discover -- muse-philippines 'https://www.youtube.com/watch?v=VIDEO_ID'` (replace VIDEO_ID with a real 11-character ID). With an existing API key, one `videos.list` request checks exact channel ID and reports duration, caption flag, embedding, privacy and region restrictions. No retry loop; quota/429 errors stop safely. Without a key, use the printed manual checklist.
3. Check identity, full content versus trailer/compilation, exact TMDB season/episode, subtitle evidence, regional distribution, payment and membership. Caption flags do not establish subtitle language or burned-in subtitle presence. Unknown API region restrictions do not establish availability.
4. Prepare strict JSON matching `officialSourceSchema`, including evidence URLs and review timestamp. Register with `npm run playback:manage -- official-add /absolute/review.json`. The command checks both database URLs' actual development branch before administrative operations. Duplicate keys/video IDs/episode mappings fail closed. Updating the same review key is explicit and retains source history; registering a conflicting alternate needs a deliberate future policy change.
5. Register the matching embed through `playback:manage add /absolute/source.json`. It starts database-disabled UNKNOWN. Use the existing authenticated localhost development preview; test actual moving content, seek, fullscreen, subtitles and regional evidence.
6. Incomplete checks: keep review UNKNOWN and database source disabled; record technical successes and remaining evidence. Compilation videos stay separate from episode endpoints.
7. Fully completed review: save `WATCH_ON_BRYXTV` using `official-add ... --reviewed`, then separately `verify SOURCE_ID AVAILABLE 'actual playback evidence' --played`. Both manifest AND database approval are required at runtime. Never use an API response alone as playback approval.
8. Run `official-audit` after review and periodically recheck changed/broken sources. Disable rather than delete; retain user history. This phase does not add an automatic scheduler or silently expire approvals.

Reference interfaces: [YouTube videos.list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list), [video resource restrictions](https://developers.google.com/youtube/v3/docs/videos), [Google API key headers](https://docs.cloud.google.com/docs/authentication/api-keys-use). No optional API key was configured during this review; the manual fallback was exercised. Live API lookup remains to be verified with a user-configured key; no new service/subscription was provisioned.

## Continue Watching and security

Video.js progress logic is unchanged. Navigation contains no progress writes; each new watch URL carries its own canonical series/season/episode identity. YouTube embeds continue to report progress tracking unsupported by the current BryxTV adapter, so no fabricated resume position or completion is stored. Documented YouTube IFrame API integration is possible future work, not an assertion that YouTube cannot report progress. Existing history remains retained when a source is unavailable.

No provider hostname, HTTPS rule, CSP origin, sandbox capability, session or ownership check was loosened. No downloads, media proxying or rehosting. No production credentials changed.

## Database changes

Both pooled `DATABASE_URL` and direct `DIRECT_URL` independently reported actual Neon branch `br-raspy-sun-az80iq7r`, matching endpoint/database/role over TLS. Four existing migrations were up to date. Administrative CLI operations recheck both connections before every operation. Three development PlaybackSource rows were added: two individually approved anime episodes and one disabled UNKNOWN Sirius candidate. Three manifest reviews added; old review/source statuses retained. No schema change, migration, reset, or deletion of existing data.

## Modified files

- `src/app/page.tsx`, `src/app/globals.css`
- `src/features/playback/components/watch-page.tsx`, new `components/episode-navigation.tsx`, new `episode-navigation.ts`, `components/official-viewing.tsx`
- New `src/features/playback/providers/watchable-catalog.ts`
- `src/features/playback/providers/official-policy.ts`, `data/official-sources.json`
- `scripts/playback-sources.ts`, new `scripts/discover-official-video.ts`
- `package.json`, `.env.example`
- New `tests/episode-navigation.test.ts`, `tests/watchable-catalog.test.ts`; updated `tests/official-sources.test.ts`, `tests/playback-providers.integration.test.ts`, `tests/ui/official-viewing.test.tsx`
- This report and README link. No new dependencies.

## Validation and remaining checks

- ESLint: passed.
- Strict TypeScript (`next typegen && tsc --noEmit`): passed.
- Prisma schema validation: passed; four migrations already up to date, no migration applied.
- Offline tests: **61 core + 17 UI = 78 passed**; six live tests intentionally skipped without opt-in origins. Coverage includes episode ordering/boundaries/specials, exact provider-only links, UNKNOWN/unavailable states, duplicate mappings, approval filtering, compact UI, authentication, watchlist and progress regressions.
- Live development integration: authentication (including four subtests), history and watchlist passed. The complete playback suite passed **3/3** on its final run. **10 distinct live tests passed across these runs**. An earlier run hit a source-API 503 and development SSR stalls; final checks recovered. A separate navigation assertion exposed a reproduced jsdom attribute-selector issue with ampersands; it now asserts the same exact URLs through DOM `getAttribute` values. No application policy was relaxed to pass tests.
- Local production server on temporary port 3002: approved source API, UNKNOWN candidate rejection, previous/next/back links and approved-only homepage filtering passed a separate read-only integration check. Production server started successfully and was stopped after verification; the existing development server was left running.
- Production build: passed with database/auth/TMDB environment values blanked for an offline build. No secrets were required at build time.
- Browser: actual full-episode playback, native seeks, and desktop iframe fullscreen/exit verified as detailed above; public S3E1 Next Episode navigated to S3E2, whose immediate S3E3 remained unavailable. Back to Episode List and Season 1 switching showed The Strongest Man, not the Season 3 episode. Guest homepage showed Sign In, no My List actions, and exactly the approved Attack on Titan/One-Punch Man watchable cards. Signed-in detail My List remained visible. No unapproved K-drama row.
- Responsive browser checks: 390×844 watch page, 768×1024 episode list and 1440×900 homepage; document widths 375, 753 and 1425 respectively (scrollbar excluded), no horizontal overflow. Native desktop fullscreen was tested before responsive emulation. Physical mobile fullscreen remains unverified.
- Disposable browser user's viewing-progress row count after all YouTube/navigation tests: **0**, confirming no fabricated progress. Only that newly created test account and test-owned integration fixtures were cleaned up. Existing sources/users/history were retained. Viewport overrides reset and temporary browser tabs closed.
- `git diff --check`: passed. No commits or pushes.

Proof screenshots (local): `/tmp/bryxtv-phase62-home.png`, `/tmp/bryxtv-phase62-mobile.png`, `/tmp/bryxtv-phase62-episode.png`, `/tmp/bryxtv-phase62-titan.png`.

Recommended next phase: verify Philippines distribution for Sirius, expand contiguous officially published anime episodes through the same review gate, and implement a documented YouTube IFrame API progress adapter with strict user/episode identity and stale-event protection. Physical iOS/Android fullscreen and cross-browser verification require real devices; responsive emulation alone cannot establish those results.
