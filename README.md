# BryxTV

**Every Story. One Screen.**

A cinematic movie and TV discovery application using Next.js App Router, strict TypeScript, Tailwind CSS, shadcn/ui, Lucide, Motion, and the TMDB API. The Midnight Blue interface is preserved from Phase 2.

## Run locally

Use Node.js 22 and npm. Run `nvm use` to select the version in `.nvmrc`.

```sh
npm ci
cp .env.example .env.local
# Set TMDB_READ_ACCESS_TOKEN in .env.local to your TMDB API Read Access Token.
npm run dev
```

Use the Local URL printed by Next.js. No `NEXT_PUBLIC_` credential is used. `.env.local` is ignored by Git. Keep the token on the server and never paste it into logs or source files. Missing credentials show a configuration state, never demo content.

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm start
```

Webpack and Tailwind’s PostCSS adapter are retained because of the original environment’s Turbopack CSS-worker port restriction.

## GitHub CI

The workflow in `.github/workflows/ci.yml` runs on pushes to `main` and
`staging`, all pull requests, and manual runs from the Actions tab. It uses
Node.js 22, caches npm downloads, installs with `npm ci`, and runs ESLint,
TypeScript validation, unit tests, and a production build in sequence.
Superseded runs on the same ref are canceled.

CI requires no repository secrets. Tests mock the TMDB transport, and the build
runs with an empty TMDB token. The GitHub token has read-only contents access.
Local `.env.local` credentials must remain untracked.

After the workflow is committed and pushed, open the repository's Actions tab
to inspect its first run. To enforce checks before merging, configure a branch
ruleset for `main` requiring pull requests and the status check
`Lint, types, tests, and build` after it has appeared in a workflow run.
Branch rules are configured in GitHub settings and are not enabled by this file.

Deployment is deferred until a hosting provider is selected. This workflow
validates the application; it does not publish or deploy it. Future deployment
should run only after these checks pass, with credentials scoped to its
deployment environment.

## Discovery and routes

- `/`: five featured trending movies with backdrops, followed by Trending Now, Now Playing in Theaters, Popular Movies, Top Rated Movies, Popular TV Series, Anime Spotlight, Korean Dramas, and Disney Collection.
- `/movies`: trending, now playing, popular, top rated, and upcoming collections.
- `/tv`: trending, popular, top rated, and currently airing series.
- `/anime`: Japanese-language animation, split into TV and movies.
- `/k-drama`: Korean-language TV with the Drama genre; popular and top-rated collections.
- `/disney`: productions credited to Walt Disney Pictures, Pixar, or Walt Disney Animation Studios. This does **not** indicate Disney+ availability.
- `/search?q=Dune&page=2`: debounced, URL-driven server search with pagination; person results are excluded. Results stream through a skeleton boundary while the input remains usable. Search pages are noindex.
- `/movie/[id]` and `/tv/[id]`: metadata, backdrop, poster, synopsis, genres, community score/votes, runtime or seasons, cast, official trailers, and recommendations.
- `/credits`: approved TMDB logo, attribution, and collection-filter explanations.

Category collection tabs use `?collection=...&page=...`. Previous/next pagination preserves query parameters. Pages are limited to 1–500 and to the upstream result count. Invalid requests render a not-found or validation state without invalid upstream calls.

Legacy `/?category=...` links redirect to the corresponding category. Existing real-title `/title/[slug]` links redirect using the Phase 2 source manifest. `/title/tmdb:movie:123` and `/title/tmdb:tv:123` also redirect. Movie and TV IDs remain separate even when numeric IDs match.

## Architecture

- `src/lib/providers/tmdb/client.ts`: server-only v3 transport; Bearer authorization, 10-second timeout, URL construction, HTTP checks, configurable cache lifetimes, and sanitized typed errors. No automatic retries amplify rate-limit failures.
- `service.ts`: typed, validated endpoint operations for lists, discovery, search, details, cast, videos, and recommendations. React request memoization avoids duplicate detail requests between metadata and page rendering.
- `normalize.ts`: provider response to normalized catalog model; IDs such as `tmdb:movie:123`, independent of UI structure. Missing metadata and images remain nullable; TMDB’s `video` flag is never treated as playback permission.
- `collections.ts`: category endpoint selection and verified production-company filters.
- `images.ts`: validated poster (`w500`), backdrop (`w1280`), and profile (`w185`) URLs. Next Image allows only `https://image.tmdb.org/t/p/**`.
- `src/features/catalog/pages`: shared category and details page composition, rendered on the server.
- `src/features/catalog/components`: existing hero, rows, cards, and image fallback; new pagination, search form, skeletons, states, and click-to-load trailer.
- `src/components/layout`: existing responsive header, Radix mobile drawer, and footer.
- `src/types/catalog.ts`: normalized application models, separate from raw TMDB types.
- `tests/tmdb.test.ts`: focused tests for normalization, type/ID collisions, image paths, validation, pagination, official trailer selection, transport authentication/cache configuration, and error handling.
- `src/lib/auth`, `src/lib/db`: reserved future integrations, still inactive.

No mock data is imported by catalog routes. Phase 2 local artwork and its source manifest are retained for provenance and legacy redirects, not as a live-data fallback. AniList can be added as another provider adapter later.

## Caching and reliability

Next.js server fetch caching/revalidation is configured explicitly:

| Data                                       | Revalidation        |
| ------------------------------------------ | ------------------- |
| Trending / currently airing                | 30 minutes          |
| Popular, now playing, top rated, discovery | 1 hour              |
| Details, cast, trailers, recommendations   | 24 hours            |
| Search                                     | No persistent cache |

API 401/403, 404, 429, 5xx, timeouts, network errors, and malformed responses become safe application errors. A failed homepage row does not discard successful rows. Optional detail sections fail independently. Missing posters and profiles use the shared image fallback. Root error/not-found and route loading boundaries provide additional recovery states.

## Production filters and attribution

Company IDs were verified with TMDB’s `/company/{id}` records: `2` Walt Disney Pictures, `3` Pixar, `6125` Walt Disney Animation Studios. OR discovery uses `with_companies=2|3|6125`. Anime requires both `with_genres=16` and `with_original_language=ja`; Korean drama requires TV discovery with `with_original_language=ko&with_genres=18`.

The unmodified logo in `public/tmdb-logo.svg` is from TMDB’s approved branding assets. Current attribution and the source link are displayed on `/credits`.

This product uses the TMDB API but is not endorsed or certified by TMDB.

## Playback and future scope

All catalog items have `isPlayable: false`. Only official YouTube trailer records with valid video IDs are offered, loaded from YouTube’s privacy-enhanced embed on explicit request. Trailers are labeled separately from full playback.

There is no movie streaming backend, authentication, database, payment, advertising, or AniList integration in this phase.
