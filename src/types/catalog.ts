export type MediaType = "movie" | "tv";
export interface MediaItem {
  id: string;
  externalId: number;
  source: "tmdb";
  mediaType: MediaType;
  title: string;
  originalTitle: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  rating: number | null;
  voteCount: number;
  genreIds: number[];
  genres: string[];
  categories: string[];
  originalLanguage: string;
  popularity: number;
  isPlayable: false;
}
export interface MediaPage {
  items: MediaItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
}
export interface Trailer {
  key: string;
  name: string;
}
export interface MediaDetails extends MediaItem {
  runtime: number | null;
  seasons: number | null;
  episodes: number | null;
  status: string | null;
}
export type CatalogResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };
export type SearchParams = Record<string, string | string[] | undefined>;
