# Phase 6.1 — anime and K-drama catalog integration

Implemented 2026-10-24 in the existing BryxTV checkout. One exact anime episode is
approved for internal playback; metadata discovery, external provider links and
incomplete reviews remain explicitly separate. No production writes, migrations,
media uploads, new dependencies, commits or pushes were made.

## 1. Features implemented

- Homepage priorities: Trending Anime, Popular K-Dramas, Anime Movies, Korean Movies;
  anime/K-drama metadata also leads the featured carousel and navigation.
- Existing Continue Watching, Movies, theatrical releases, popular/top-rated movies,
  TV Series and Disney collections remain functional. Search and browse-only titles
  remain available; cards retain their existing cinematic design and no new buttons.
- Added a Korean Movies collection to K-Drama. Anime trending uses weekly TMDB series
  filtered to Japanese animation, with popular anime discovery as a fallback.
- Detail/episode pages and the public playback API express four effective states:
  WATCH_ON_BRYXTV, WATCH_ON_PROVIDER, UNKNOWN, UNAVAILABLE.
- Internal Play/Watch actions still require the existing database approval policy.
  Official YouTube sources additionally require a reviewed exact mapping, uploader,
  allowed embedding, public access and confirmed PH availability in the manifest.
- Added a compact official channel discovery directory to Anime/K-Drama categories.
- Development CLI supports typed official video reviews, evidence inspection and
  disabled records without adding a web admin dashboard or public write endpoint.

## 2. Modified files

Catalog and branding priorities:
- `src/app/page.tsx`
- `src/constants/site.ts`
- `src/lib/providers/tmdb/collections.ts`
- `src/lib/providers/tmdb/normalize.ts`
- `src/features/catalog/components/hero-slide.tsx`
- `src/features/catalog/pages/category-page.tsx`
- `src/features/catalog/pages/details-page.tsx`

Playback policy, presentation and administration:
- New `src/features/playback/providers/official-policy.ts`
- New `src/features/playback/providers/official-sources.server.ts`
- New `src/features/playback/data/official-sources.json`
- New `src/features/playback/components/official-viewing.tsx`
- New `src/features/playback/components/official-channels.tsx`
- `src/features/playback/providers/resolver.ts`
- `src/features/playback/components/episode-selector.tsx`
- `src/features/playback/components/watch-page.tsx`
- `src/features/playback/components/embedded-player.tsx`
- `src/app/api/playback-sources/route.ts`
- `src/app/globals.css`
- `scripts/playback-sources.ts`

Tests and documentation:
- New `tests/official-sources.test.ts`
- New `tests/ui/official-viewing.test.tsx`
- `tests/playback-providers.integration.test.ts`
- `tests/tmdb.test.ts`
- New `docs/anime-kdrama-catalog.md`

The repository already contained changes from earlier phases; those were preserved.
Prisma Client was regenerated into its existing ignored output directory.

## 3. Official providers researched and supported

The channel directory is a discovery aid, not permission to ingest all uploads:

| Channel | Identity/reference evidence | Source reviews added |
| --- | --- | --- |
| Muse Asia | Verified @MuseAsia uploader and corporate social directory https://www.e-muse.com.tw/cn/social-media/ | One-Punch Man S3E1 |
| Muse Philippines | Native channel page identifies Muse Philippines, Verified, @MusePhilippines | None; discovery only |
| Ani-One Asia | Verified @AniOneAsia channel; owner https://www.medialink.com.hk/en/Anione.aspx | None; discovery only |
| Ani-One Philippines | Verified collaborator @AniOnePhilippines; Medialink PH expansion https://www.medialink.com.hk/document/esg2024.pdf | Collaborating publisher on compilation |
| Ani-One PH Collection | Native collaboration dialog on the exact video identifies @AniOnePHCollection and verified Ani-One Philippines | One compilation, external only |
| KBS WORLD TV | Verified @kbsworldtv uploader; official broadcaster https://kbsworld.kbs.co.kr/about/kbskorea.php | One standalone special, pending PH review |
| SBS World | Native @sbsworld channel and full-drama playlist listings; corporate media reference https://www.sbsmnc.co.kr/uploaded/board/cream/pdf_4089255979fc40a92056eb71d07512180.pdf | None; discovery only, no individual upload approved |

Medialink explicitly distinguishes public AVOD and paid ULTRA membership content.
No channel-level free-access assumption or membership bypass was introduced.

YouTube references reviewed:
- https://support.google.com/youtube/answer/171780?hl=en — supported embedding,
  privacy-enhanced youtube-nocookie.com host, publisher embedding controls and Referer.
- https://developers.google.com/youtube/terms/required-minimum-functionality —
  identification, advertisements, branding and player requirements.
- https://developers.google.com/youtube/iframe_api_reference — documented events,
  getCurrentTime/getDuration, and minimum player dimensions.

## 4. Metadata titles discovered

Existing server-side TMDB search confirmed the following originals, rather than remakes
or similarly named titles. These are metadata discovery examples, not free-playback claims:

| Title | TMDB series ID | Release year |
| --- | --- | --- |
| Solo Leveling | 127532 | 2024 |
| Demon Slayer: Kimetsu no Yaiba | 85937 | 2019 |
| JUJUTSU KAISEN | 95479 | 2020 |
| One Piece (anime) | 37854 | 1999 |
| Queen of Tears | 215720 | 2024 |
| Lovely Runner | 230923 | 2024 |
| Vincenzo | 117376 | 2021 |
| Business Proposal | 154825 | 2022 |

No full-episode source was registered by this phase for these eight examples. Browse
and search metadata continue to work independently of playback approval. Existing
TMDB adult filtering remains; discovery is not a parental-rating certification.

## 5. Actual verified playable episode

**One-Punch Man — Season 3, Episode 1: Strategy Meeting**

- TMDB: series 63926, season 3, episode 1; TMDB episode 6501542, 24-minute metadata.
- Exact official video: https://www.youtube.com/watch?v=t7KlZ38p39w
- Exact approved embed: https://www.youtube-nocookie.com/embed/t7KlZ38p39w
- Publisher: verified Muse Asia, @MuseAsia, channel UCGbshtvS9t-8CW11W7TooQg.
- Native title: One-Punch Man - Episode 25 (S3E01) [English Sub]. The publisher's
  description identifies Episode 25 as Strategy Meeting, matching TMDB S3E1.
- Publisher's own pinned availability notice explicitly includes Philippines among
  Muse Asia YouTube's available regions for this title. This is title-specific evidence,
  not a promise that every channel upload is accessible in the Philippines.
- The listing reports 24:00; the embedded player reports approximately 24:01.
- Actual BryxTV preview playback advanced to 00:43. Native forward controls sought to
  02:43, and playback continued to 02:56. Film content was visible, not just a poster,
  iframe load event, HTTP 200 response or advertisement.
- YouTube native fullscreen filled the reported 1280 × 720 viewport and exited.
- After approval, the normal public route worked without a preview parameter:
  `/watch/tv/63926?season=3&episode=1`.
- Database source `cmvmb591f0000vysbgdksjafr`: enabled=true, AVAILABLE, verification
  evidence and timestamp stored through the existing CLI after those observations.
- This is browser-automated sample playback of the full-episode upload, not a human
  end-to-end watch of every minute or a physical-device certification.
- English subtitles are provider-declared; the iframe did not expose a selectable CC
  track for this episode. No claim that subtitles are selectable is made. Audio language
  remains unverified in source metadata rather than guessed from original TMDB language.

## 6. Provider-only title

**The Healer Who Was Banished from His Party, Is, in Fact, the Strongest**

- TMDB series 244625, season 1; TMDB season metadata has 12 episodes.
- Exact official item: https://www.youtube.com/watch?v=dBdEWgtknLM
- Provider title identifies Ep 1–12 (EN sub); player lists 4:41:06.
- Native YouTube collaboration dialog lists Ani-One PH Collection
  (UCKwe-CrlORY6sF8kLsFB5qw) and verified Ani-One Philippines
  (UCZGEjiTMwMv-Mf-t3VLBlJQ). The item description identifies licensed anime.
- Recorded as COMPILATION, season 1, episode=null, WATCH_ON_PROVIDER.
- `/tv/244625` offers an explicit external link. It does not offer twelve internal
  playback links or manufacture independently seekable episode boundaries.
- Internal compilation playback is unsupported in this phase. PH access was not
  independently confirmed, so the UI says so and lets the official provider enforce
  current restrictions. This is not claimed as verified internal playback.

## 7. Unknown/unavailable titles

**If We Were a Season (2017)**

- TMDB movie 640828, a standalone television special, not an inferred anthology episode.
- Official upload: https://www.youtube.com/watch?v=vZ7EMIH0oHw
- Verified KBS WORLD TV uploader and matching title/cast/story; native duration 1:06:48,
  embed approximately 1:06:49, TMDB runtime 67 minutes.
- Native public playback followed provider advertisements. The existing BryxTV iframe
  also played actual content through 01:05 with English subtitles visible; fullscreen
  and exit passed. No ads or player branding were hidden.
- PH entitlement is still unverified. The manifest records embedding ALLOWED but region
  UNKNOWN, so database source `cmvmb5acl0000xfsbg0k3q4o4` stays disabled/UNKNOWN with no
  availability verification timestamp. It has no public internal Play action.

Other unreviewed anime/K-drama episodes remain UNAVAILABLE unless a candidate review
exists, in which case they remain UNKNOWN. Series metadata is never treated as evidence
that every episode can play. A dependency failure also cannot produce a Play button.

Valkaama movie 74890 remains disabled/UNKNOWN. It is excluded from normal normalized
movie browsing, search and recommendations; the exclusion is scoped to movie type so
an unrelated TV title with the same numeric TMDB ID is preserved. Its development
source was not deleted, reapproved or improved.

## 8. Episode/compilation mapping behavior

The existing TMDB season/episode adapter still supplies episode titles, thumbnails,
durations and descriptions. The review manifest adds provider identity, content format,
audio language (nullable), subtitle languages, source duration, regional/access/embed
review outcomes, evidence and review timestamp. No unnecessary database model was added.

Explicit EPISODE mappings require a TV ID, season and episode. MOVIE entries require a
movie ID and cannot contain episode coordinates. COMPILATION entries cannot contain an
episode number. A video ID can occur only once in the validated manifest; it cannot be
repeated across separate episode records or simultaneously disguised as a compilation.
Compilations never match per-episode playback queries. Wrong season/absolute numbering
(e.g. treating Muse's Episode 25 as S1E25) is rejected by exact identity matching.

## 9. YouTube playback/security/fullscreen

The existing reviewed YouTube privacy provider is reused. No wildcard hostname,
query-string injection, arbitrary URL input, extracted media URL, new player system,
proxy, rehosting, global script injection or security relaxation was introduced.
YouTube advertisements and native branding remain untouched. The original iframe
sandbox, permissions and strict-origin-when-cross-origin referrer policy are preserved.
YouTube's minimum 200px player height is respected on narrow layouts; the provider
handles any necessary letterboxing. Existing fullscreen sizing/exit rules remain.

Both reviewed YouTube uploads played in their development previews and passed native
desktop fullscreen/exit. The approved anime also played through the normal route.
Physical iOS/Android fullscreen and actual restricted-region behavior were not tested;
no VPN, account-membership bypass or unsupported player manipulation was attempted.

Homepage responsive checks at 375, 390, 768 and 1440px showed zero horizontal overflow
and the four requested content priorities in order. The external compilation detail
page exposed exactly its official provider link and zero internal watch links.

## 10. Continue Watching compatibility

The documented IFrame Player API has state events and getCurrentTime/getDuration, but
this phase keeps the existing plain iframe integration rather than adding a partially
verified API bridge and altering its URL/CSP policy. YouTube progress tracking is
explicitly unsupported by this BryxTV adapter, not claimed impossible in YouTube itself.
No undocumented messages or iframe timestamp scraping are used by application code.

Consequently YouTube embeds do not fabricate viewing progress or populate exact Resume
Watching/Continue Watching. The disposable embed user's progress-row count remained zero.
Video.js MP4/HLS restore, restart, 12-second saves, pause/end behavior, stale-write guards,
user isolation, history persistence and Continue Watching remain unchanged and passed
existing regression suites. My List remains available on authenticated detail pages.
Existing progress and saved titles are retained when a source is disabled or restricted.

## 11. Database and development administration

Both DATABASE_URL and DIRECT_URL were independently checked against development branch
**br-raspy-sun-az80iq7r** before every CLI write. Post-change read-only checks confirmed
both connections, the same development server identity, and direct migration status.
Prisma 7.10.1 validation and client generation passed. All four existing migrations are
applied. **No schema change or new migration was needed.**

The existing youtube-privacy PlaybackProvider was registered/upserted, and two exact
PlaybackSource rows were created. Only the verified One-Punch Man episode was promoted
from UNKNOWN to AVAILABLE using `verify ... AVAILABLE ... --played`. The KBS candidate
and Valkaama source remain disabled/UNKNOWN. Tests remove only their own temporary
fixtures; the review manifest and registered sources remain. The disposable browser
account was cleaned up without deleting existing users or source records.

Administration reuses `npm run playback:manage -- ...`:

1. Prepare a strict JSON review matching `officialSourceSchema` (the committed manifest
   provides examples). Only canonical reviewed channel URLs and 11-character video IDs
   are accepted. `official-review KEY` displays the stored evidence locally.
2. `official-add /absolute/path/review.json` stores a candidate. Non-UNKNOWN dispositions
   require `--reviewed`. Writes are atomic and duplicate video mappings are rejected.
3. For internal eligibility, the review must explicitly say WATCH_ON_BRYXTV and record
   verified uploader/mapping, ALLOWED embedding, AVAILABLE_PH and PUBLIC access. This
   metadata alone cannot make an unapproved database source playable.
4. Use the existing `add` JSON operation with the exact approved embed sourceUrl and
   matching movie/TV target. New/reapproved database sources are disabled and UNKNOWN.
   The CLI rejects YouTube registrations without a matching reviewed official identity.
5. Use the existing authenticated localhost development preview to verify real playback.
   Only after success use `verify SOURCE_ID AVAILABLE "Real reviewer/browser/evidence" --played`.
   The CLI additionally checks the manifest's complete YouTube eligibility before approval.
6. `disable SOURCE_ID` stops internal playback. Re-save a manifest review with enabled=false
   to hide a broken external link without deleting its review. UNKNOWN/UNAVAILABLE database
   verification also disables playback and preserves history/source records.

There is no ordinary-user source submission endpoint or admin dashboard. Review metadata
is server-only; private approval evidence and administrative flags are not serialized in
public playback DTOs. Effective availability requires both server policy and DB approval.
The public API adds an `availability` label without changing its existing source DTOs.

## 12. Validation results

- ESLint and strict TypeScript: passed.
- Offline: 56 core tests and 16 UI tests passed; five optional live tests skipped by the
  offline command and executed separately against development.
- Live: all nine distinct tests passed, including authentication subtests, My List,
  history, source-policy/Continue Watching regressions and the new four-state catalog
  assertions. The final playback-only regression run also passed both tests after the
  approval/unique-mapping gates were tightened.
- Tests cover exact host/ID validation, identity/mapping requirements, compilation
  isolation, four states, regional/member/payment restrictions, disabled sources,
  safe external links, server-only eligibility, privacy, guest browsing and normal
  public watch resolution. Existing player/fullscreen and progress tests passed.
- Prisma validate/generate and direct migration status: passed, schema current.
- Production build: passed with external credentials explicitly blank, including
  TypeScript validation and all route generation. The final run includes the type-scoped
  Valkaama exclusion and its TV-ID collision regression test.
- Diff whitespace check: passed.

## 13. Remaining limitations

- One exact episode is internally approved; neither its entire season nor the eight
  metadata examples are silently promoted. No full anime movie was verified this phase.
- Availability and publisher licensing can change. Reviews are timestamped snapshots,
  not continuous entitlement checks; the provider still enforces its restrictions.
- KBS PH verification, physical mobile fullscreen, source audio languages, and exact
  YouTube progress synchronization remain incomplete and are reported as such.
- SBS/Muse PH/Ani-One Asia channel discovery does not approve any individual upload.
- Source approval is developer tooling; the small manifest is version-controlled server
  data intended for reviewed changes/deployment, not a multi-user runtime admin database.
- Family-oriented catalog priorities do not certify every metadata result as suitable
  for every age; no new parental-rating system was part of this phase.

## 14. Manual verification steps

1. On the running app, open `/tv/63926?season=3` and the approved episode route
   `/watch/tv/63926?season=3&episode=1` as guest and signed-in user. Confirm only S3E1
   has an internal action, its source is Muse Asia's exact upload, and My List still works.
2. Test native fullscreen/exit and rotation on physical iPhone/Android/tablet devices;
   verify provider branding, subtitles and controls remain accessible.
3. Open `/tv/244625`: follow the official season-compilation external link. Confirm
   no independent episode links were invented; review PH/payment restrictions there.
4. For the KBS candidate, use the existing authenticated localhost development preview
   with source `cmvmb5acl0000xfsbg0k3q4o4`. Confirm PH availability from publisher/current
   regional evidence before changing its review disposition or database approval.
5. Search the eight metadata examples; expect browse/detail/My List support without a
   promise of free episodes. Verify Movies, Disney and other category routes still work.
6. Play a licensed MP4/HLS demo, pause and refresh to verify exact resume and Continue
   Watching. YouTube sources should not create guessed progress records.
7. To onboard further titles, verify each exact upload, format, regional/access rights,
   mapping and actual playback independently. Never bulk-approve a channel or bypass
   a region, membership, embedding restriction or advertisement.
