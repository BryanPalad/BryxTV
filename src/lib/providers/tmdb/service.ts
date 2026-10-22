import "server-only";
import { cache } from "react";
import { tmdbRequest } from "./client";
import { TMDBError, catalogErrorMessage } from "./errors";
import {
  validateId,
  validatePage,
  validateSearchQuery,
  validateMediaType,
} from "./validation";
import { normalizePage, normalizeDetails } from "./normalize";
import { profileImageUrl } from "./images";
import type {
  TMDBMedia,
  TMDBPage,
  TMDBCredits,
  TMDBVideos,
  DiscoverFilters,
} from "./types";
import type { MediaType, CastMember, CatalogResult } from "@/types/catalog";
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";
function media(value: unknown): value is TMDBMedia {
  return (
    object(value) &&
    Number.isSafeInteger(value.id) &&
    Number(value.id) > 0 &&
    (typeof value.title === "string" || typeof value.name === "string") &&
    (value.genre_ids === undefined ||
      (Array.isArray(value.genre_ids) &&
        value.genre_ids.every((id) => typeof id === "number"))) &&
    (value.genres === undefined ||
      (Array.isArray(value.genres) &&
        value.genres.every(
          (genre) =>
            object(genre) &&
            typeof genre.id === "number" &&
            typeof genre.name === "string",
        )))
  );
}
function pageResponse(raw: unknown): TMDBPage {
  if (
    !object(raw) ||
    !Array.isArray(raw.results) ||
    !Number.isInteger(raw.page) ||
    !Number.isInteger(raw.total_pages) ||
    !Number.isInteger(raw.total_results) ||
    Number(raw.page) < 1 ||
    Number(raw.total_pages) < 0 ||
    Number(raw.total_results) < 0
  )
    throw new TMDBError("INVALID_RESPONSE");
  return {
    results: raw.results.filter(media),
    page: Number(raw.page),
    total_pages: Number(raw.total_pages),
    total_results: Number(raw.total_results),
  };
}
function list(path: string, revalidate = 3600) {
  return cache(async (page = 1) =>
    pageResponse(
      await tmdbRequest(path, {
        query: { page: validatePage(page) },
        revalidate,
      }),
    ),
  );
}
export const getTrendingMovies = list("/trending/movie/week", 1800);
export const getTrendingTV = list("/trending/tv/week", 1800);
export const getPopularMovies = list("/movie/popular");
export const getNowPlayingMovies = list("/movie/now_playing");
export const getTopRatedMovies = list("/movie/top_rated");
export const getUpcomingMovies = list("/movie/upcoming");
export const getPopularTV = list("/tv/popular");
export const getTopRatedTV = list("/tv/top_rated");
export const getCurrentlyAiringTV = list("/tv/on_the_air", 1800);
const details = (type: MediaType) =>
  cache(async (id: string | number) => {
    const raw = await tmdbRequest(`/${type}/${validateId(id)}`, {
      revalidate: 86400,
    });
    if (!media(raw) || raw.id !== Number(id))
      throw new TMDBError("INVALID_RESPONSE");
    return normalizeDetails(raw, type);
  });
export const getMovieDetails = details("movie");
export const getTVDetails = details("tv");
export const searchMulti = cache(async (query: string, page = 1) => {
  const normalized = validateSearchQuery(query);
  const requestedPage = validatePage(page);
  if (!normalized)
    return { items: [], page: 1, totalPages: 0, totalResults: 0 };
  return normalizePage(
    pageResponse(
      await tmdbRequest("/search/multi", {
        query: {
          query: normalized,
          page: requestedPage,
          include_adult: false,
        },
        revalidate: 0,
      }),
    ),
  );
});
function validateFilters(filters: DiscoverFilters) {
  validatePage(filters.page ?? 1);
  if (
    filters.with_original_language &&
    !/^[a-z]{2}$/.test(filters.with_original_language)
  )
    throw new TMDBError("INVALID_REQUEST");
  for (const key of ["with_genres", "with_companies"] as const)
    if (filters[key] && !/^\d+([,|]\d+)*$/.test(filters[key]))
      throw new TMDBError("INVALID_REQUEST");
  if (
    filters.sort_by &&
    ![
      "popularity.desc",
      "vote_average.desc",
      "primary_release_date.desc",
      "first_air_date.desc",
    ].includes(filters.sort_by)
  )
    throw new TMDBError("INVALID_REQUEST");
  if (
    filters["vote_count.gte"] !== undefined &&
    (!Number.isInteger(filters["vote_count.gte"]) ||
      filters["vote_count.gte"]! < 0)
  )
    throw new TMDBError("INVALID_REQUEST");
  return { ...filters, include_adult: false, page: filters.page ?? 1 };
}
export async function discoverMovies(filters: DiscoverFilters = {}) {
  return pageResponse(
    await tmdbRequest("/discover/movie", { query: validateFilters(filters) }),
  );
}
export async function discoverTV(filters: DiscoverFilters = {}) {
  return pageResponse(
    await tmdbRequest("/discover/tv", { query: validateFilters(filters) }),
  );
}
async function credits(
  type: MediaType,
  id: string | number,
): Promise<CastMember[]> {
  const raw = await tmdbRequest(`/${type}/${validateId(id)}/credits`, {
    revalidate: 86400,
  });
  if (!object(raw) || !Array.isArray(raw.cast))
    throw new TMDBError("INVALID_RESPONSE");
  const cast = raw.cast.filter(
    (entry): entry is TMDBCredits["cast"][number] =>
      object(entry) &&
      Number.isSafeInteger(entry.id) &&
      typeof entry.name === "string",
  );
  return cast.slice(0, 12).map((entry) => ({
    id: entry.id,
    name: entry.name,
    character: typeof entry.character === "string" ? entry.character : "",
    profileUrl: profileImageUrl(entry.profile_path),
  }));
}
export const getMovieCredits = cache((id: string | number) =>
  credits("movie", id),
);
export const getTVCredits = cache((id: string | number) => credits("tv", id));
async function videos(
  type: MediaType,
  id: string | number,
): Promise<TMDBVideos> {
  const raw = await tmdbRequest(`/${type}/${validateId(id)}/videos`, {
    revalidate: 86400,
  });
  if (!object(raw) || !Array.isArray(raw.results))
    throw new TMDBError("INVALID_RESPONSE");
  return {
    results: raw.results.filter(
      (entry): entry is TMDBVideos["results"][number] =>
        object(entry) &&
        typeof entry.key === "string" &&
        typeof entry.name === "string" &&
        typeof entry.site === "string" &&
        typeof entry.type === "string" &&
        typeof entry.official === "boolean",
    ),
  };
}
export const getMovieVideos = cache((id: string | number) =>
  videos("movie", id),
);
export const getTVVideos = cache((id: string | number) => videos("tv", id));
export const getRecommendations = cache(
  async (type: MediaType, id: string | number) =>
    normalizePage(
      pageResponse(
        await tmdbRequest(
          `/${validateMediaType(type)}/${validateId(id)}/recommendations`,
          { revalidate: 86400 },
        ),
      ),
      type,
    ),
);
export async function catalogResult<T>(
  request: () => Promise<T>,
): Promise<CatalogResult<T>> {
  try {
    return { ok: true, data: await request() };
  } catch (error) {
    return { ok: false, message: catalogErrorMessage(error) };
  }
}
