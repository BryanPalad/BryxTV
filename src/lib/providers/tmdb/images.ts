type ImageKind = "poster" | "backdrop" | "profile";
const sizes = { poster: "w500", backdrop: "w1280", profile: "w185" } as const;
export function tmdbImageUrl(
  path: unknown,
  kind: ImageKind = "poster",
): string | null {
  if (
    typeof path !== "string" ||
    !/^\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(path)
  )
    return null;
  return `https://image.tmdb.org/t/p/${sizes[kind]}${path}`;
}
export const posterImageUrl = (path: unknown) => tmdbImageUrl(path, "poster");
export const backdropImageUrl = (path: unknown) =>
  tmdbImageUrl(path, "backdrop");
export const profileImageUrl = (path: unknown) => tmdbImageUrl(path, "profile");
