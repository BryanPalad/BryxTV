export const site = {
  name: "BryxTV",
  tagline: "Every Story. One Screen.",
  description:
    "Discover your next favorite story. Movies, series, anime, Disney, and K-drama, together on BryxTV.",
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
