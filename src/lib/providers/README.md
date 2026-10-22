# Providers

`tmdb/` contains the active server-only TMDB client, endpoint service, response normalization, discovery collections, image utilities, and validation/error helpers.

Server-rendered routes fetch through this adapter and pass normalized `src/types/catalog.ts` models to the existing UI. No credential is returned to a Client Component. Future AniList integration should use a separate adapter that produces an application-level catalog model rather than exposing raw provider responses to UI components.
