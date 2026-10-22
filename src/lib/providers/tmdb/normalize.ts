import type {
  MediaItem,
  MediaType,
  MediaDetails,
  MediaPage,
  Trailer,
} from "@/types/catalog";
import type { TMDBMedia, TMDBPage, TMDBVideos } from "./types";
import { posterImageUrl, backdropImageUrl } from "./images";

// TMDB's movie/TV genre taxonomy; unknown future genres remain safe to render.
const genreNames: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Science Fiction",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  10770: "TV Movie",
};
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const date = (value: unknown) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value))
    ? value
    : null;
export function normalizeMedia(raw: TMDBMedia, type: MediaType): MediaItem {
  const releaseDate = date(
    type === "movie" ? raw.release_date : raw.first_air_date,
  );
  const genreIds = (
    Array.isArray(raw.genres)
      ? raw.genres.map((genre) => genre.id)
      : (raw.genre_ids ?? [])
  ).filter((id) => Number.isInteger(id) && id > 0);
  const genres =
    raw.genres?.map((genre) => text(genre.name)).filter(Boolean) ??
    genreIds
      .map((id) => genreNames[id])
      .filter((genre): genre is string => !!genre);
  const language = text(raw.original_language);
  const votes = Math.max(0, finite(raw.vote_count));
  const rating =
    votes > 0 && finite(raw.vote_average) > 0
      ? Math.min(
          10,
          Math.max(0, Math.round(finite(raw.vote_average) * 10) / 10),
        )
      : null;
  const categories = [type === "movie" ? "Movies" : "TV Series"];
  if (language === "ja" && genreIds.includes(16)) categories.push("Anime");
  if (type === "tv" && language === "ko" && genreIds.includes(18))
    categories.push("K-Drama");
  const posterUrl = posterImageUrl(raw.poster_path),
    backdropUrl = backdropImageUrl(raw.backdrop_path);
  return {
    id: `tmdb:${type}:${raw.id}`,
    externalId: raw.id,
    source: "tmdb",
    mediaType: type,
    title: text(type === "movie" ? raw.title : raw.name) || "Untitled",
    originalTitle:
      text(type === "movie" ? raw.original_title : raw.original_name) || null,
    overview:
      text(raw.overview) || "A synopsis is not available for this title yet.",
    posterPath: posterUrl ? raw.poster_path! : null,
    backdropPath: backdropUrl ? raw.backdrop_path! : null,
    posterUrl,
    backdropUrl,
    releaseDate,
    releaseYear: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    rating,
    voteCount: votes,
    genres,
    genreIds,
    categories,
    originalLanguage: language,
    popularity: Math.max(0, finite(raw.popularity)),
    isPlayable: false,
  };
}
export function normalizePage(raw: TMDBPage, type?: MediaType): MediaPage {
  return {
    items: raw.results
      .filter(
        (item) =>
          !item.adult &&
          (type || item.media_type === "movie" || item.media_type === "tv"),
      )
      .map((item) =>
        normalizeMedia(item, type ?? (item.media_type as MediaType)),
      ),
    page: raw.page,
    totalPages: Math.min(500, Math.max(0, raw.total_pages)),
    totalResults: raw.total_results,
  };
}
export function normalizeDetails(
  raw: TMDBMedia,
  type: MediaType,
): MediaDetails {
  return {
    ...normalizeMedia(raw, type),
    runtime: finite(raw.runtime) > 0 ? finite(raw.runtime) : null,
    seasons:
      finite(raw.number_of_seasons, -1) >= 0
        ? finite(raw.number_of_seasons)
        : null,
    episodes:
      finite(raw.number_of_episodes, -1) >= 0
        ? finite(raw.number_of_episodes)
        : null,
    status: text(raw.status) || null,
  };
}
/** Only official YouTube trailers; never treat TMDB's video flag as playback. */
export function selectTrailer(videos: TMDBVideos): Trailer | null {
  const video = videos.results.find(
    (video) =>
      video.site === "YouTube" &&
      video.type === "Trailer" &&
      video.official === true &&
      /^[a-zA-Z0-9_-]{11}$/.test(video.key),
  );
  return video ? { key: video.key, name: video.name } : null;
}
