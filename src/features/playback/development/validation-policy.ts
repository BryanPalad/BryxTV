/** Exact publisher-owned asset; never derive this URL from request parameters. */
export const validationMovieURL = "https://video.blender.org/object-storage/web_videos/bf1f3fb5-b119-4f9f-9930-8e20e892b898-720.mp4";
export const validationPath = "/dev/playback-validation";
export function validationAllowed(env: Record<string, string | undefined>, host: string) {
  return env.NODE_ENV === "development" && !env.VERCEL_ENV &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/.test(host);
}
export function validValidationMovieURL(value: string) {
  return value === validationMovieURL;
}
