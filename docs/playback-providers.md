# Phase 6 — Multi-provider playback

## Implemented architecture

The existing watch routes and Video.js player are retained. A code-reviewed registry
(`src/features/playback/providers/registry.ts`) defines provider identity, display name,
source type, exact allowed hosts, enabled state, fullscreen, progress tracking capability,
manual availability verification, and URL validation. Database provider rows must match
a known registry slug/type and be enabled; editing a row cannot expand the host allowlist.

Supported types:
- `VIDEOJS_MP4`: existing authorized local MP4 demo; Video.js playback and account progress.
- `VIDEOJS_HLS`: existing authorized local HLS demo; same player/progress behavior.
- `EXTERNAL_EMBED`: sandboxed HTTPS iframe using an explicitly reviewed provider policy.

The reviewed embed URL policy permits the exact Archive film URL
`https://archive.org/embed/valkaama` and the
`www.youtube-nocookie.com/embed/VIDEO_ID` format, without query parameters, fragments,
credentials, alternate ports, redirects, or suffix hostnames. This policy is configuration,
not evidence that any particular video is licensed. Valkaama is rights-approved in development, but remains disabled/UNKNOWN pending complete
playback and fullscreen verification. See `external-embed-verification.md`.
The official Google developer embed example is used only as a URL-policy test fixture;
synthetic iframe unit tests are not real playback or licensing verification.

Official references reviewed:
- https://developers.google.com/youtube/player_parameters
- https://developers.google.com/youtube/iframe_api_reference

Add another provider by extending the code registry with an exact host/path policy and
capabilities, registering its matching database provider, then approving exact source
records. Watch pages do not require provider-specific rewrites. Reviewed remote Video.js
origins feed media/connect CSP directives; current Video.js registry entries are local.
Signed/private playback URLs and entitlement adapters are not implemented in this phase.

## Database safety and models

Migration: `20261023100000_add_playback_providers` (Prisma 7.10.1).
Both pooled and direct connections were independently checked in read-only transactions
before migration. Both reported Neon development branch `br-raspy-sun-az80iq7r` and the
same endpoint/database. Only this development branch received the additive migration.
No reset, production migration, or existing user/watchlist/progress deletion occurred.

`PlaybackProvider` stores a unique slug, display name, type, enabled state, and timestamps.
`PlaybackSource` references its provider with restrictive deletion. It stores the exact
movie/episode identity, URL, label, priority, enabled/authorization flags, private rights
evidence, availability status, private verification evidence, and last-check timestamps.

Movie keys are `movie:ID`; episode keys are `tv:ID:SEASON:EPISODE`. Unique
`(providerId, contentKey, sourceUrl)` contains no nullable members. It permits multiple
legitimate sources while rejecting duplicate records. SQL CHECK constraints enforce
movie/TV combinations and evidence/timestamp requirements. Lookup indexes support
identity, eligibility, priority, and per-title episode queries. No auth model changed.

Existing demo entries remain in the reviewed local source registry, preserving their
URLs, attribution, source IDs, guest storage keys, and distinct demo progress identities.

## Resolution API and catalog

`GET /api/playback-sources?mediaType=movie&tmdbId=ID`

`GET /api/playback-sources?mediaType=tv&tmdbId=ID&seasonNumber=N&episodeNumber=N`

The read-only endpoint is public because the current approved sources are public playback;
it exposes no account data. Responses are private/no-store. Any future entitlement-restricted
provider must enforce its server-side access policy before issuing playback URLs.

Identifiers and duplicate/unknown query parameters are rejected. A valid TMDB ID alone
never creates a source URL. Sources must be individually mapped in the database, with an
enabled provider/source, verified rights evidence, matching registry policy, and AVAILABLE
status backed by manual playback evidence and `lastCheckedAt`. Options are sorted by
priority and stable ID. Responses whitelist only public playback information. Internal
provider IDs, rights/verification evidence, and administrative flags are not serialized.

UNKNOWN rights-approved sources produce a pending state, not a playable option.
UNAVAILABLE sources produce an unavailable state. Disabled/unapproved sources are excluded.
A dependency failure produces a sanitized 503; watch pages retain accessible metadata and
an actionable unavailable message. Source rows are not deleted for temporary failures.

Movie/TV detail pages and episode lists show approved playback, pending verification, or
Video Not Available. Default TV playback selects the earliest approved episode; priority
chooses among its sources. Browsing, TMDB homepage rows, My List actions, and metadata
remain intact. Availability-based homepage filtering is deferred to Phase 6.1.

## Player behavior and security

The selector appears on existing movie/episode/demo watch pages, displays provider and
source labels, switches only among server-approved options, and remembers the selected
source ID per target in sessionStorage. Missing/obsolete IDs safely fall back to the first
approved source. Resume links explicitly select a tracking-capable source so a stored iframe
preference cannot redirect exact resume into an unsupported player. No automatic provider
cycling or external-site redirect occurs. A failed Video.js source offers its existing retry
control; other approved sources remain manually selectable.

The embedded player provides a responsive 16:9 frame, accessible title, loading indicator,
retry and fullscreen controls, and conservative timeout/error guidance. Sandbox permissions
are limited to scripts, the provider's own origin, and presentation. Popups, forms, and top
navigation are not granted. Referrer policy is strict-origin-when-cross-origin. No provider
scripts are injected into BryxTV. CSP frame origins derive from reviewed registry hosts;
existing auth, object/base/form/frame-ancestor and other security protections are preserved.

An iframe load event only means its document loaded; it does not prove video playback.
Cross-origin failures may be invisible to the parent, so the UI explicitly says to retry or
switch sources. No claim of automatic failure detection is made.

All configured external embeds currently declare progress tracking unsupported. They mount
no Video.js progress hook and accept no postMessage progress at all, so arbitrary messages
cannot write zero, guessed positions, or overwrite valid account progress. Exact resume is
clearly described as unavailable. A future documented event adapter must validate the exact
origin, iframe window, event schema, and finite timestamps/positions before enabling tracking.

Video.js keeps the existing 12-second active-playback saves, pause/end/cleanup behavior,
completion guards, restart, serialized/stale-write protection, guest local storage, and
Neon persistence. Continue Watching includes enabled, approved, verified, tracking-capable
sources and the authorized demos. Unsupported embeds do not create fake history. Existing
history is retained; titles that only have an untracked embed link to details with an exact
resume-unavailable explanation.

## Development administration

No public administrative API is added. `npm run playback:manage -- ...` is a local,
server-only development tool. It refuses production mode and checks the actual branch ID
through BOTH PostgreSQL connections before any write. It prints neither connection strings
nor source URLs. No new environment variables or dependencies are required.

1. Verify embedding/distribution rights for the exact title and provider, not just URL syntax.
2. Register a code-reviewed provider:

   `npm run playback:manage -- provider youtube-privacy`

3. Prepare a private JSON file with the following fields, using a real rights-approved URL
   and its correct TMDB mapping (placeholders below are deliberately not executable sources):

   ```json
   {
     "provider": "youtube-privacy",
     "target": { "mediaType": "movie", "tmdbId": 123 },
     "sourceUrl": "<exact approved HTTPS embed URL>",
     "displayLabel": "Official creator player",
     "priority": 10,
     "authorizationEvidence": "<rights holder, permission/license reference, scope and review date>"
   }
   ```

   For TV use `mediaType: "tv"` plus `seasonNumber` and `episodeNumber` inside `target`.
   Never map a demo excerpt to a full commercial title.

4. Run `npm run playback:manage -- add /absolute/path/source.json`.
   This stores rights approval but leaves playback disabled and UNKNOWN. Re-approval resets verification.
5. Manually test the exact approved provider player. Confirm actual playback and embedding
   permission; a HEAD/HTTP 200 response is insufficient. Only after success record:

   `npm run playback:manage -- verify SOURCE_ID AVAILABLE "Manual playback confirmed; date, browser and reviewer details" --played`

6. Record failures conservatively with `verify SOURCE_ID UNAVAILABLE "Description of manual playback failure"`.
   UNKNOWN may also be recorded. Both disable playback and preserve the source rather than deleting it.
   Only AVAILABLE with `--played` enables playback.
7. Disable a record with `npm run playback:manage -- disable SOURCE_ID`.

The `--played` flag is an explicit operator assertion, not automated verification. This tool
cannot independently establish legal rights or current remote playback. Review evidence before
using it. Test fixtures in automated tests are marked disposable and removed by exact IDs/labels.

## Files in this phase

Created:
- `prisma/migrations/20261023100000_add_playback_providers/migration.sql`
- `src/features/playback/providers/registry.ts`, `types.ts`, `policy.ts`, `resolver.ts`
- `src/features/playback/components/embedded-player.tsx`, `source-selector.tsx`
- `src/app/api/playback-sources/route.ts`
- `scripts/development-db.ts`, `scripts/playback-sources.ts`
- `tests/playback-providers.test.ts`, `tests/playback-providers.integration.test.ts`
- `tests/ui/playback-sources.test.tsx`
- `docs/playback-providers.md`

Modified:
- `prisma/schema.prisma` and regenerated ignored Prisma client
- `next.config.ts`, `package.json`, `README.md`, `src/app/globals.css`
- `src/features/playback/components/watch-page.tsx`, `episode-selector.tsx`
- `src/features/catalog/pages/details-page.tsx`
- `src/features/history/server.ts`, `types.ts`, `components/history-card.tsx`
- `src/features/watchlist/server.ts`: regression testing exposed an intermittent empty-update
  upsert race during concurrent additions. An atomic `createMany(skipDuplicates: true)` now
  preserves idempotent add behavior without changing the watchlist API, ownership, or UI.

## Verification and manual testing

Automated tests cover registration, exact URL/host policy, unsafe URL rejection, source
eligibility, identity isolation, priority, unknown/unavailable statuses, private DTO fields,
CSP, source selection/session preference, reload controls, invalid iframe rejection, and
existing auth/My List/history/player regressions. Synthetic iframe tests assert rendering
and policy only; they are not external playback verification.

The live provider suite verifies BOTH development connections, creates temporary exact-source
fixtures, tests movie/episode queries, uniqueness, pending/available/unavailable states,
priority and input rejection, then removes its own source/provider fixtures. Existing live
auth, history, and My List suites use disposable accounts and preserve real users.

Manual checks:
1. Visit `/watch/demo/big-buck-bunny`: source selector, MP4 playback, pause, restart, and guest
   local progress work. Repeat with `/watch/demo/big-buck-bunny-hls`.
2. Sign in, play/pause, refresh, and check Home → Continue Watching and account menu → History.
3. Visit a catalog title without approved sources: details stay accessible and no fake Play
   or Resume link appears. Episode selectors require an explicit valid season/episode.
4. After properly onboarding multiple real sources, switch sources and refresh. Confirm
   session preference, manual fallback, fullscreen, and unsupported-resume explanation.
5. Mark a source UNKNOWN/UNAVAILABLE or disable it using the development tool. It must
   disappear from playable options; UNKNOWN must not be called verified available.
6. Confirm unapproved hosts, URL query injection, malformed episode identifiers, and
   arbitrary URL query parameters are rejected.

Known limitations: no external full-length film was rights-approved and playback-verified
in this phase; no external source was enabled. Real iframe playback, iframe fullscreen, and
provider event tracking were therefore not claimed as browser-verified. No scraping, paid
service, unverified aggregator, production database change, commit, or push was introduced.

### Results recorded for Phase 6

- Prisma 7.10.1 schema validation and client generation passed.
- Both Neon connections were verified against the expected development branch before
  migration; post-migration read-only verification also passed. Direct migration status
  reports all four migrations applied and the database schema up to date.
- ESLint and strict TypeScript checks passed; `git diff --check` passed.
- Offline automated suite: 47 core tests and 10 UI tests passed. The four optional live
  suites are skipped by the offline command and were run separately against development.
- Live authentication, viewing history, playback-provider, and My List suites all passed
  sequentially (8 tests including the authentication subtests). The expanded provider suite
  additionally confirmed that database-backed Video.js progress appears in Continue Watching
  with a specific tracking-capable source, then disappears on unavailability while progress
  is retained. Temporary fixtures used existing licensed MP4/HLS assets, never retained
  fake commercial movie mappings. Its disposable account and source/provider rows were removed.
- Production build passed with external credentials explicitly blank. No live database or
  TMDB response was required to complete the build.
- Browser checks passed for the guest MP4 selector and play/pause (10-second duration),
  HLS local resume and play/pause, and a catalog movie with accessible metadata and
  Video Not Available with zero iframe/video elements. Multiple-source switching and
  session preference were verified in UI tests with synthetic iframe fixtures.
- The iframe tests cover exact-host rejection, restrictive attributes, reload controls,
  unsupported resume messaging, and ignoring arbitrary cross-origin progress messages.
  They do not establish external licensing or actual remote playback availability.
- Real external iframe playback and external fullscreen were not browser-tested because
  no external film was rights-approved and playback-verified for registration.
- No dependencies, authentication providers, production records, or Git commits changed.

### Phase 6.0.1 development verification preview

Signed-in users on a loopback host in `NODE_ENV=development` can test a registered,
rights-approved external embed through `/watch/movie/ID?preview=SOURCE_ID`. The source
ID must match the requested title and the reviewed provider URL policy. This does not
change availability, accept arbitrary URLs, or expose previews through the public API.
Guests, other hosts and production builds cannot resolve previews. No progress tracking
is attached to these frames. See `external-embed-verification.md` for the registered film.
