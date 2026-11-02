# Phase 5.5 — Viewing History and Continue Watching

Account-backed progress is separate from My List. It uses the existing Better Auth
session, server-only Prisma singleton, pooled application connection, direct migration
connection, approved source registry, Video.js player, and TMDB metadata adapters.
No authentication providers, credentials, watchlist endpoints, or video sources change.

## Database and migration

Prisma 7.10.1; migration `20261023080000_add_viewing_progress`.
Before applying it, both pooled and direct connections were queried independently in
read-only transactions. Neon reported development branch `br-raspy-sun-az80iq7r` for both;
endpoint and database identity matched. Only then was the additive migration deployed.
No reset, production migration, or existing-table deletion was performed.

`ViewingProgress` references User with cascade deletion. A non-null canonical
`contentKey` plus `userId` is unique: `movie:ID`, `tv:ID:SEASON:EPISODE`.
This avoids PostgreSQL nullable-composite uniqueness problems. Indexes support recent
history and unfinished lookups. SQL CHECK constraints enforce identity combinations,
positive duration, and bounded positions. `observedAt` orders samples atomically.

The current registry contains only authorized ten-second demo excerpts. These use a
separate `demo:slug` identity and nullable TMDB ID, rather than pretending to represent
a full commercial movie. Movie and episode identities are ready for future approved
registry entries; this phase adds no such streams or providers.

## API contract

All responses are `private, no-store`, vary on Cookie, and require a live server session.
Ownership is derived exclusively from the session. Mutation requests require the trusted
same origin and JSON. Strict Zod schemas reject injected owner IDs, malformed identifiers,
negative/non-finite positions, invalid durations, and inconsistent episode combinations.
Positions exceeding duration are clamped. Public DTOs omit owner and internal record IDs.

- `GET /api/viewing-progress?page=1&type=movie|tv|demo`: newest first, 24 per page.
- `GET /api/viewing-progress?continue=1`: at most 12 unfinished, nonzero progress items
  with an actual authorized source. Completed/unavailable titles remain in history.
- `GET /api/viewing-progress/movie/ID`: one movie or null.
- `GET /api/viewing-progress/tv/ID?season=N&episode=N`: one explicit episode or null.
- `GET /api/viewing-progress/demo/slug`: a registered demo excerpt or null.
- `PUT /api/viewing-progress`: identity plus `positionSeconds`, `durationSeconds`,
  `observedAt` (Unix milliseconds), optional `ended`. Atomic parameterized PostgreSQL
  upsert only updates when the incoming observation is newer.
- `DELETE /api/viewing-progress`: identity only; idempotent, owner-scoped removal.

Typical statuses: 200 success, 400 invalid input, 401 guest, 403 untrusted origin,
413 oversized body, 415 unsupported content type, 503 unavailable dependency.

## Player and UI behavior

The player waits for metadata and session resolution before restoring progress. Loading
metadata alone does not create a record. During active playback, account saves are throttled
to 12 seconds; pause, seek, completion, explicit restart, and cleanup capture progress.
A serial writer coalesces pending updates and deduplicates repeated flushes. Backward seeking
is supported: freshness uses observation time, not the greatest position. Client clocks should
be reasonably synchronized; observations more than a minute in the future are rejected.

Completion uses natural end or a 95% threshold. Completed or duration-mismatched records do
not resume near the end. Explicit restart clears completion at zero. Failed restoration allows
playback but prevents overwriting unknown account progress. Subsequent save failures show a
safe notice and retry on the next sample. Guest progress continues using the existing local
storage keys and source/version validation, without a Neon write or account-history request.
Guest local progress is not silently imported into an account.

Route/pagehide saves are best effort, using keepalive for small JSON updates. Abrupt browser
termination or network loss can still lose the most recent unsent seconds. No progress events
are invented for trailers or opaque cross-origin iframes; iframe tracking is not implemented.

The homepage fetches private progress only after authentication, scopes results to the current
user, and hides empty or guest rows. Shared catalog carousel and artwork fallback components
are reused. History filters, pages, removal failures, empty/loading/error states are supported.
Authenticated detail pages show latest episode progress and resume/restart only when that exact
progress identity has an approved source. Unavailable titles retain their unavailable notice.

## Files in this phase

Created:
- `prisma/migrations/20261023080000_add_viewing_progress/migration.sql`
- `src/features/history/types.ts`, `server.ts`, `handler.ts`, `player-progress.ts`
- `src/features/history/components/use-player-progress.ts`, `continue-watching.tsx`,
  `history-card.tsx`, `history-grid.tsx`, `detail-progress.tsx`
- `src/app/api/viewing-progress/route.ts`
- `src/app/api/viewing-progress/[mediaType]/[tmdbId]/route.ts`
- `src/app/history/page.tsx`, `loading.tsx`, `error.tsx`
- `tests/history.test.ts`, `tests/history.integration.test.ts`, `tests/ui/history.test.tsx`
- `docs/history.md`

Updated:
- `prisma/schema.prisma` (model, enum, user relation; regenerated ignored client)
- `src/app/page.tsx`, `src/app/globals.css`
- `src/features/catalog/pages/details-page.tsx`
- `src/features/playback/components/video-player.tsx`, `player-loader.tsx`, `watch-page.tsx`
- `src/app/watch/movie/[id]/page.tsx`, `src/app/watch/demo/[id]/page.tsx`
- `src/features/auth/components/account-menu.tsx`
- `src/components/layout/site-header.tsx`, `mobile-navigation.tsx`
- `src/lib/auth/redirect.ts`, `package.json`, `README.md`

No new package dependencies or environment variables.

## Verification and manual checks

Offline tests cover strict inputs, movie/episode identity, completion, resume guards,
metadata failure, unavailable playback, throttling, pause/end/cleanup, explicit restart,
guest storage, serialization/coalescing, restoration failures, and guest/empty homepage visibility.
The opt-in live suite verifies the development branch before disposable writes, then tests real
API auth, origin checks, account isolation, uniqueness, stale ordering, episode lookup, pagination,
completed history retention, Continue Watching exclusion, removal, and a fresh login's persistence.
Existing authentication and My List suites are run as regressions.

To reproduce manually:
1. Sign in on the development server and open `/watch/demo/big-buck-bunny`.
2. Play a few seconds, pause, and wait for “Progress saved to your account.”
3. Refresh: the player should restore the saved position without an initial zero-position write.
4. Visit Home: Continue Watching links back to that demo. Account menu → Viewing History
   shows its progress. A separate signed-in browser/device using the same account resumes it too.
5. Let the excerpt finish: it stays in History as Completed and disappears from Continue Watching.
6. Use Restart from Beginning, play and pause again to create unfinished progress.
7. Remove the record in History, wait for the list to refresh, and refresh the page again.
8. Sign out: private history redirects to login and the homepage has no personal row.
9. Visit any catalog title without an approved source: no misleading Resume button appears.

Integration accounts are removed by exact ID/email after each run; real user data is preserved.

### Results from this implementation

- ESLint: passed, zero warnings/errors.
- TypeScript (`next typegen` + strict `tsc --noEmit`): passed.
- Offline suite: 42 core tests + 8 UI tests passed. Three live suites are intentionally
  skipped in the offline command and were executed separately against development.
- Live history API suite: passed, including concurrent movie upserts, separate TV episodes,
  stale-write rejection, owner isolation, real pagination, completion and fresh-session persistence.
- Live authentication regression: passed (four subtests plus the parent test).
- Live My List regression: passed on isolated rerun. An initial concurrent regression run
  returned one transient 503; the final independent run passed all assertions.
- Prisma validation and client generation: passed (7.10.1).
- Direct-connection migration status: all three migrations applied; database up to date.
- Production build: passed with external-service credentials explicitly blank, confirming
  the build does not depend on a live database or TMDB response.
- Browser: authenticated MP4 play/pause saved to the account; refresh restored position
  1.110898s; Home showed its Continue Watching card; History showed the same record;
  natural end reached 10/10 seconds and stored Completed; Home then hid Continue Watching;
  restart worked; History removal persisted after refresh. Existing HLS play/pause also saved
  account progress. Mobile history layout was checked at a 390×844 viewport override with
  no document overflow, and the override was reset afterwards.
- Cached-media restoration has a hook-level regression test using an already-ready media
  element, unmount/remount, a saved seek position, no initial write, and pause persistence.
- Browser tests used a disposable account, not an existing user's account. A fresh HTTP
  login verified device-independent persistence; two physical devices were not used.
- No iframe progress tracking was implemented or claimed, and no catalog streams were added.
