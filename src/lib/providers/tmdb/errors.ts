export type TMDBErrorCode =
  | "CONFIGURATION"
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "TIMEOUT"
  | "INVALID_RESPONSE";
export class TMDBError extends Error {
  constructor(
    public readonly code: TMDBErrorCode,
    public readonly status: number | null = null,
  ) {
    super(code);
    this.name = "TMDBError";
  }
}
export function errorFromStatus(status: number) {
  return new TMDBError(
    status === 401 || status === 403
      ? "UNAUTHORIZED"
      : status === 404
        ? "NOT_FOUND"
        : status === 429
          ? "RATE_LIMITED"
          : "UNAVAILABLE",
    status,
  );
}
export function catalogErrorMessage(error: unknown): string {
  if (!(error instanceof TMDBError))
    return "We couldn’t load this collection. Please try again shortly.";
  const messages: Record<TMDBErrorCode, string> = {
    CONFIGURATION:
      "The catalog connection is not configured yet. Please check back soon.",
    INVALID_REQUEST:
      "This request is invalid. Check the search or page number and try again.",
    UNAUTHORIZED:
      "The catalog connection needs attention. Please try again later.",
    NOT_FOUND: "This title could not be found.",
    RATE_LIMITED:
      "The catalog is busy. Please wait a moment before trying again.",
    UNAVAILABLE:
      "The catalog is temporarily unavailable. Please try again shortly.",
    TIMEOUT: "The catalog took too long to respond. Please try again shortly.",
    INVALID_RESPONSE:
      "The catalog returned an unexpected response. Please try again later.",
  };
  return messages[error.code];
}
