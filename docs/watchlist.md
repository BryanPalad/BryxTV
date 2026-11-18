# Phase 5.4 — Persistent My List

## Storage and migration

Prisma `WatchlistItem` stores only an ID, owning user, numeric TMDB ID, movie/TV
media type, and creation/update timestamps. `WatchlistMediaType` is a PostgreSQL
enum. The compound unique key prevents duplicate titles for each user; movies
and television may share the same numeric TMDB ID without colliding. The
`[userId, createdAt, id]` index supports recent-first user queries. Deleting a
user cascades to their own list records, consistent with sessions and accounts.

Generated and reviewed migration:
`prisma/migrations/20261023060000_add_persistent_watchlist/migration.sql`.
It creates only the enum, table, indexes, and cascading user foreign key. Both
pooled and direct connections were checked against development branch ID
`br-raspy-sun-az80iq7r` before `prisma migrate deploy` used DIRECT_URL. No production
connection, database reset, or destructive schema operation was used.

After regenerating Prisma following schema changes, restart the development
server so an existing hot-reload singleton does not retain the old client.

## Endpoints and privacy

- `GET /api/watchlist`: the authenticated user's saved movie/TV keys, newest first.
  Clients check single or multiple saved states from this one request rather than
  querying once per visible card.
- `GET /api/watchlist?tmdbId=550&mediaType=movie`: an owner-scoped saved-state check.
- `POST /api/watchlist`: idempotent add/upsert with `{ tmdbId, mediaType }`.
- `DELETE /api/watchlist`: idempotent removal with the same JSON body.

Every operation validates a live Better Auth database session. The user ID comes
only from the session. Strict Zod validation rejects extra keys, invalid types,
non-integer/out-of-range IDs, and client-provided owner IDs. Writes require JSON
and the configured application origin, rejecting cross-site requests. Responses
use `Cache-Control: private, no-store` and `Vary: Cookie`; errors are sanitized.
Database credentials and TMDB tokens stay server-only. Auth linking is unchanged.

## UI and synchronization

One root provider shares saved state across detail pages, featured heroes, and
movie/TV cards. It fetches saved keys once per user session, applies immediate
optimistic changes, prevents repeated actions while pending, rolls back failures,
and displays a short accessible toast. Saved state is scoped to the current user
and hidden on logout. A failed initial read offers a Retry My List action.

Guests clicking My List go to login with a safe return URL for that exact title.
Returning from login does not save automatically; the user explicitly clicks
again. The safe redirect allowlist now includes `/my-list`.

Authenticated desktop/mobile/account navigation includes My List. The protected
`/my-list` page provides All/Movies/TV filters, recent-first ordering, 24-item
pagination, the existing poster cards, remove buttons, an empty state, and loading
and retry/error boundaries. Removed records disappear immediately and return if
the mutation fails.

Only each page's metadata is fetched, using existing cached TMDB detail methods
and a maximum of six concurrent requests. Missing, removed, or temporarily
unavailable titles retain their records and show a removable placeholder.

## Files for this phase

Created:
- `prisma/migrations/20261023060000_add_persistent_watchlist/migration.sql`
- `src/app/api/watchlist/route.ts`
- `src/app/my-list/page.tsx`, `loading.tsx`, `error.tsx`
- `src/features/watchlist/types.ts`, `server.ts`, `handler.ts`, `metadata.ts`
- `src/features/watchlist/components/watchlist-provider.tsx`
- `src/features/watchlist/components/watchlist-button.tsx`
- `src/features/watchlist/components/watchlist-nav.tsx`
- `src/features/watchlist/components/saved-grid.tsx`
- `src/features/watchlist/watchlist.css`
- `tests/watchlist.test.ts`, `tests/watchlist.integration.test.ts`
- `tests/ui/watchlist.test.tsx`
- `docs/watchlist.md`

Modified:
- `prisma/schema.prisma`
- `src/app/layout.tsx`, `src/app/globals.css`
- `src/components/layout/site-header.tsx`, `mobile-navigation.tsx`
- `src/features/auth/components/account-menu.tsx`
- `src/lib/auth/redirect.ts`
- `src/features/catalog/components/media-card.tsx`, `hero-slide.tsx`
- `src/features/catalog/pages/details-page.tsx`
- `package.json`, `README.md`

No dependencies were added.

## Validation and manual checks

```sh
npm run db:validate
npm run db:generate
npx prisma migrate status
npm run lint
npm run typecheck
npm test
npm run build
BRYX_WATCHLIST_TEST_ORIGIN=http://localhost:3001 npm run test:watchlist:integration
```

The opt-in integration suite verifies the known development branch before
creating two random disposable `@example.invalid` users. It covers empty lists,
movie/TV adds, concurrent duplicates, ownership isolation, private responses,
fresh-session persistence, idempotent removal, protected-page access, and exact
ID/email cleanup. The default suite skips live database tests and includes
validation, API/ownership behavior, TMDB failure/concurrency, redirect safety,
and UI optimistic synchronization, pending states, rollback, and guest redirects.

Manual checks:
1. As a guest, click My List on a title; verify the login return path and no auto-save.
2. Sign in, save a movie and TV series, and open My List from the header.
3. Check Movies/TV filters, refresh persistence, remove a title, then remove the
   last title to verify the empty state and Browse Movies action.
4. Check mobile navigation, keyboard focus, and guest demo playback.
5. Log out and revisit My List; verify login is required. Log in on another
   browser/device to confirm the same saved list.

## Limits

There is no push-based live synchronization across devices/tabs. Reloading a
page or starting a fresh session retrieves the persisted database state. Public
TMDB metadata may remain cached for its existing cache duration; private list
membership is never publicly cached. Metadata failures do not delete records.
The small saved-key list is fetched in full; the metadata grid is paginated.


## Recorded validation

- Prisma validation and generation passed; migration status reports two migrations
  applied and the database up to date.
- ESLint, strict TypeScript, and an offline production build passed.
- 40 default offline/UI tests passed; the two opt-in live suites are skipped by default.
- The live auth regression passed all five checks.
- The live watchlist integration passed, including concurrent upserts, scoped saved
  state, cross-session persistence, and exact disposable-user cleanup.
- Browser checks covered guest-to-title login return, explicit movie/TV saves,
  My List navigation/grid, movie filtering, the mobile poster grid and mobile menu
  link, and removal down to the empty state. The disposable browser account was
  deleted with exact ID/email scope.
- No commits or pushes were created; production was not migrated.


## Phase 5.4.1 — Browsing refinement

Poster cards, including My List and unavailable-metadata cards, no longer include
watchlist actions or reserve button spacing. Posters continue to open their movie
or TV detail routes with the existing metadata and hover effects.

Watchlist actions are visible only after authentication is confirmed, on title
details and the featured hero. Guests retain More Info and public browsing without
watchlist buttons, disabled placeholders, or save-related sign-in prompts. The
existing saved state, optimistic updates, rollback, and private API are unchanged.
To remove a saved title, open its detail page and use In My List. No database,
API, auth-policy, or playback changes were made for this refinement.

The former Phase 5.4 card actions and guest-click-to-login behavior described above
are superseded by this UI refinement. UI tests now assert hidden guest/loading
actions and signed-in movie/TV actions while retaining synchronization/rollback
coverage. Compact card-button styling has been removed.
