export const site = {
  name: "BryxTV",
  tagline: "Every Story. One Screen.",
  description:
    "Discover popular anime, K-dramas, anime films and Korean cinema on BryxTV, alongside movies, series and Disney productions.",
} as const;
export const categories = [
  "Home",
  "Anime",
  "K-Drama",
  "Movies",
  "TV Series",
  "Disney",
] as const;
export type Category = (typeof categories)[number];
export const categoryPaths: Record<Category, string> = {
  Home: "/",
  Movies: "/movies",
  "TV Series": "/tv",
  Disney: "/disney",
  Anime: "/anime",
  "K-Drama": "/k-drama",
};
export function categoryHref(category: Category) {
  return categoryPaths[category];
}
