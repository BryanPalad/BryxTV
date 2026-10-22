import "server-only";
import * as tmdb from "./service";
import { normalizePage } from "./normalize";
import type { MediaPage } from "@/types/catalog";
export type BrowseCategory =
  | "Movies"
  | "TV Series"
  | "Disney"
  | "Anime"
  | "K-Drama";
export interface Collection {
  key: string;
  title: string;
  load: (page: number) => Promise<MediaPage>;
}
// Verified via /3/company/{id}: 2 Walt Disney Pictures, 3 Pixar, 6125 Walt Disney Animation Studios.
// Production credits only. This is NOT a Disney+ streaming availability filter.
export const DISNEY_COMPANIES = "2|3|6125";
const movie = (load: typeof tmdb.getPopularMovies) => async (page: number) =>
  normalizePage(await load(page), "movie");
const tv = (load: typeof tmdb.getPopularTV) => async (page: number) =>
  normalizePage(await load(page), "tv");
export const collections: Record<BrowseCategory, Collection[]> = {
  Movies: [
    {
      key: "trending",
      title: "Trending Movies",
      load: movie(tmdb.getTrendingMovies),
    },
    {
      key: "now-playing",
      title: "Now Playing in Theaters",
      load: movie(tmdb.getNowPlayingMovies),
    },
    {
      key: "popular",
      title: "Popular Movies",
      load: movie(tmdb.getPopularMovies),
    },
    {
      key: "top-rated",
      title: "Top Rated Movies",
      load: movie(tmdb.getTopRatedMovies),
    },
    {
      key: "upcoming",
      title: "Upcoming Movies",
      load: movie(tmdb.getUpcomingMovies),
    },
  ],
  "TV Series": [
    { key: "trending", title: "Trending Series", load: tv(tmdb.getTrendingTV) },
    { key: "popular", title: "Popular Series", load: tv(tmdb.getPopularTV) },
    {
      key: "top-rated",
      title: "Top Rated Series",
      load: tv(tmdb.getTopRatedTV),
    },
    {
      key: "airing",
      title: "Currently Airing Series",
      load: tv(tmdb.getCurrentlyAiringTV),
    },
  ],
  Disney: [
    {
      key: "popular",
      title: "Disney-produced Movies",
      load: async (page) =>
        normalizePage(
          await tmdb.discoverMovies({
            page,
            with_companies: DISNEY_COMPANIES,
            sort_by: "popularity.desc",
          }),
          "movie",
        ),
    },
    {
      key: "top-rated",
      title: "Top Rated Disney Productions",
      load: async (page) =>
        normalizePage(
          await tmdb.discoverMovies({
            page,
            with_companies: DISNEY_COMPANIES,
            sort_by: "vote_average.desc",
            "vote_count.gte": 200,
          }),
          "movie",
        ),
    },
  ],
  Anime: [
    {
      key: "tv",
      title: "Japanese Animation · Series",
      load: async (page) =>
        normalizePage(
          await tmdb.discoverTV({
            page,
            with_genres: "16",
            with_original_language: "ja",
            sort_by: "popularity.desc",
          }),
          "tv",
        ),
    },
    {
      key: "movies",
      title: "Japanese Animation · Movies",
      load: async (page) =>
        normalizePage(
          await tmdb.discoverMovies({
            page,
            with_genres: "16",
            with_original_language: "ja",
            sort_by: "popularity.desc",
          }),
          "movie",
        ),
    },
  ],
  "K-Drama": [
    {
      key: "popular",
      title: "Popular Korean Dramas",
      load: async (page) =>
        normalizePage(
          await tmdb.discoverTV({
            page,
            with_genres: "18",
            with_original_language: "ko",
            sort_by: "popularity.desc",
          }),
          "tv",
        ),
    },
    {
      key: "top-rated",
      title: "Top Rated Korean Dramas",
      load: async (page) =>
        normalizePage(
          await tmdb.discoverTV({
            page,
            with_genres: "18",
            with_original_language: "ko",
            sort_by: "vote_average.desc",
            "vote_count.gte": 100,
          }),
          "tv",
        ),
    },
  ],
};
