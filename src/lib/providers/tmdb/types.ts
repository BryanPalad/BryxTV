export interface TMDBMedia {
  id: number;
  media_type?: "movie" | "tv" | "person";
  adult?: boolean;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  original_language?: string;
  popularity?: number;
  runtime?: number | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
}
export interface TMDBPage {
  page: number;
  total_pages: number;
  total_results: number;
  results: TMDBMedia[];
}
export interface DiscoverFilters {
  page?: number;
  sort_by?:
    | "popularity.desc"
    | "vote_average.desc"
    | "primary_release_date.desc"
    | "first_air_date.desc";
  with_genres?: string;
  with_original_language?: string;
  with_companies?: string;
  "vote_count.gte"?: number;
}
export interface TMDBCredits {
  cast: {
    id: number;
    name: string;
    character?: string;
    profile_path?: string | null;
  }[];
}
export interface TMDBVideos {
  results: {
    key: string;
    name: string;
    site: string;
    type: string;
    official: boolean;
  }[];
}
