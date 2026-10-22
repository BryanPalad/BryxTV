import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMedia,
  normalizePage,
  selectTrailer,
} from "../src/lib/providers/tmdb/normalize";
import { tmdbImageUrl } from "../src/lib/providers/tmdb/images";
import {
  validateId,
  validateMediaType,
  validatePage,
  validateSearchQuery,
} from "../src/lib/providers/tmdb/validation";
import { createTMDBClient } from "../src/lib/providers/tmdb/client";
import {
  TMDBError,
  catalogErrorMessage,
} from "../src/lib/providers/tmdb/errors";
import { paginatedHref, mediaHref } from "../src/features/catalog/utils";
import type { TMDBMedia } from "../src/lib/providers/tmdb/types";

const raw: TMDBMedia = {
  id: 42,
  title: "Movie",
  name: "Series",
  overview: "Overview",
  release_date: "2024-02-01",
  first_air_date: "2020-05-10",
  original_language: "ja",
  genre_ids: [16],
  poster_path: "/poster.jpg",
  vote_average: 8.237,
  vote_count: 100,
};
test("movie and TV normalization has collision-free identifiers and routes", () => {
  const movie = normalizeMedia(raw, "movie"),
    tv = normalizeMedia(raw, "tv");
  assert.notEqual(movie.id, tv.id);
  assert.equal(movie.id, "tmdb:movie:42");
  assert.equal(tv.id, "tmdb:tv:42");
  assert.equal(mediaHref(movie), "/movie/42");
  assert.equal(mediaHref(tv), "/tv/42");
  assert.equal(movie.title, "Movie");
  assert.equal(tv.title, "Series");
  assert.equal(movie.releaseYear, 2024);
  assert.equal(tv.releaseYear, 2020);
  assert.equal(movie.rating, 8.2);
  assert.equal(movie.isPlayable, false);
});
test("normalization handles missing metadata and does not confuse language with anime", () => {
  const item = normalizeMedia(
    { id: 1, title: "", original_language: "ja" },
    "movie",
  );
  assert.equal(item.title, "Untitled");
  assert.equal(item.rating, null);
  assert.equal(item.posterUrl, null);
  assert.equal(item.backdropUrl, null);
  assert.equal(item.releaseYear, null);
  assert.ok(!item.categories.includes("Anime"));
  assert.ok(normalizeMedia(raw, "movie").categories.includes("Anime"));
  assert.ok(
    !normalizeMedia(
      { ...raw, original_language: "en" },
      "movie",
    ).categories.includes("Anime"),
  );
  assert.ok(
    !normalizeMedia(
      { ...raw, original_language: "ko", genre_ids: [18] },
      "movie",
    ).categories.includes("K-Drama"),
  );
  assert.ok(
    normalizeMedia(
      { ...raw, original_language: "ko", genre_ids: [18] },
      "tv",
    ).categories.includes("K-Drama"),
  );
});
test("search removes person and adult results and caps pagination at TMDB limit", () => {
  const page = normalizePage({
    page: 1,
    total_pages: 900,
    total_results: 10,
    results: [
      { ...raw, media_type: "person" },
      { ...raw, media_type: "movie" },
      { ...raw, media_type: "tv" },
      { ...raw, media_type: "movie", adult: true },
    ],
  });
  assert.equal(page.items.length, 2);
  assert.equal(page.totalPages, 500);
  assert.deepEqual(
    page.items.map((item) => item.mediaType),
    ["movie", "tv"],
  );
});
test("image utilities reject untrusted paths and use the appropriate size", () => {
  assert.equal(
    tmdbImageUrl("/poster.jpg"),
    "https://image.tmdb.org/t/p/w500/poster.jpg",
  );
  assert.equal(
    tmdbImageUrl("/backdrop.png", "backdrop"),
    "https://image.tmdb.org/t/p/w1280/backdrop.png",
  );
  assert.equal(
    tmdbImageUrl("/person.webp", "profile"),
    "https://image.tmdb.org/t/p/w185/person.webp",
  );
  for (const path of [
    null,
    undefined,
    "",
    "https://evil.test/x.jpg",
    "//evil.test/a.jpg",
    "/../secret.jpg",
    "/test.jpg?x=1",
    "/a.svg",
  ])
    assert.equal(tmdbImageUrl(path), null);
});
test("query, media type, IDs, and page numbers validate before any request", () => {
  assert.equal(validateSearchQuery("  The   Bear  "), "The Bear");
  assert.equal(validateSearchQuery(undefined), "");
  for (const value of ["x".repeat(101), ["query"], "bad\u0000query"])
    assert.throws(() => validateSearchQuery(value), TMDBError);
  for (const value of [0, -1, 501, "1.5", "1e2", "01", ["2"], NaN, Infinity])
    assert.throws(() => validatePage(value), TMDBError);
  assert.equal(validatePage("500"), 500);
  for (const value of ["../1", "1?x=2", 0, "-2", Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => validateId(value), TMDBError);
  assert.throws(() => validateMediaType("person"), TMDBError);
});
test("pagination preserves query text and filters without copying an old page", () => {
  const url = new URL(
    paginatedHref(
      "/search",
      { q: "Dune & sand", collection: "popular", page: "1" },
      2,
    ),
    "https://bryx.test",
  );
  assert.equal(url.searchParams.get("q"), "Dune & sand");
  assert.equal(url.searchParams.get("collection"), "popular");
  assert.deepEqual(url.searchParams.getAll("page"), ["2"]);
});
test("trailers require official supported metadata and valid video IDs", () => {
  const base = {
    key: "AbCdEf012_-",
    name: "Trailer",
    site: "YouTube",
    type: "Trailer",
    official: true,
  };
  assert.deepEqual(
    selectTrailer({ results: [{ ...base, official: false }, base] }),
    { key: base.key, name: "Trailer" },
  );
  for (const override of [
    { site: "Unknown" },
    { official: false },
    { type: "Clip" },
    { key: "javascript:alert(1)" },
  ])
    assert.equal(selectTrailer({ results: [{ ...base, ...override }] }), null);
});
test("client puts bearer credentials only in a header and configures caching", async () => {
  const calls: {
    url: URL;
    options: RequestInit;
  }[] = [];
  const fakeFetch = (async (input, options) => {
    calls.push({ url: new URL(String(input)), options: options! });
    return Response.json({ ok: true });
  }) as typeof fetch;
  const client = createTMDBClient({
    getToken: () => "fake-test-credential",
    fetcher: fakeFetch,
  });
  await client("/search/multi", {
    query: { query: "Dune & sand", page: 2 },
    revalidate: 0,
  });
  await client("/movie/popular", { revalidate: 1800 });
  assert.equal(
    new Headers(calls[0]!.options.headers).get("Authorization"),
    "Bearer fake-test-credential",
  );
  assert.equal(calls[0]!.url.searchParams.get("query"), "Dune & sand");
  assert.ok(!String(calls[0]!.url).includes("fake-test-credential"));
  assert.equal(calls[0]!.options.cache, "no-store");
  assert.equal(calls[0]!.options.next, undefined);
  assert.equal(calls[1]!.options.next?.revalidate, 1800);
  assert.equal(calls[1]!.options.cache, "force-cache");
  await assert.rejects(client("https://evil.test"), {
    code: "INVALID_REQUEST",
  });
});
test("client sanitizes status errors, network failures, malformed JSON, and timeouts", async () => {
  for (const [status, code] of [
    [401, "UNAUTHORIZED"],
    [403, "UNAUTHORIZED"],
    [404, "NOT_FOUND"],
    [429, "RATE_LIMITED"],
    [500, "UNAVAILABLE"],
    [503, "UNAVAILABLE"],
  ] as const) {
    const client = createTMDBClient({
      getToken: () => "fake-secret",
      fetcher: (async () =>
        new Response("private upstream response", { status })) as typeof fetch,
    });
    await assert.rejects(
      client("/movie/1"),
      (error: unknown) =>
        error instanceof TMDBError &&
        error.code === code &&
        !catalogErrorMessage(error).includes("private"),
    );
  }
  const missing = createTMDBClient({ getToken: () => undefined });
  await assert.rejects(missing("/movie/1"), { code: "CONFIGURATION" });
  const invalid = createTMDBClient({
    getToken: () => "fake",
    fetcher: (async () => new Response("invalid-json")) as typeof fetch,
  });
  await assert.rejects(invalid("/movie/1"), { code: "INVALID_RESPONSE" });
  for (const [name, code] of [
    ["Error", "UNAVAILABLE"],
    ["TimeoutError", "TIMEOUT"],
    ["AbortError", "TIMEOUT"],
  ] as const) {
    const client = createTMDBClient({
      getToken: () => "fake",
      fetcher: (async () => {
        const error = new Error("sensitive message");
        error.name = name;
        throw error;
      }) as typeof fetch,
    });
    await assert.rejects(
      client("/movie/1"),
      (error: unknown) =>
        error instanceof TMDBError &&
        error.code === code &&
        !error.message.includes("sensitive"),
    );
  }
});
