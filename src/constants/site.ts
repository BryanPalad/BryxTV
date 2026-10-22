export const site = {
  name: "BryxTV",
  tagline: "Every Story. One Screen.",
  description:
    "Discover your next favorite story. Explore movies, series, anime, Disney, and K-drama on BryxTV.",
} as const;
export const categories = [
  "Home",
  "Movies",
  "TV Series",
  "Disney",
  "Anime",
  "K-Drama",
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
