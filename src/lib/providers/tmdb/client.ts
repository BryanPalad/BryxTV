import "server-only";
import { TMDBError, errorFromStatus } from "./errors";

type Query = Record<string, string | number | boolean | undefined>;
interface RequestOptions {
  query?: Query;
  revalidate?: number;
}
interface ClientOptions {
  getToken: () => string | undefined;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

/** Single server-only transport. Error bodies and credentials never cross the boundary. */
export function createTMDBClient({
  getToken,
  fetcher,
  timeoutMs = 10_000,
}: ClientOptions) {
  return async function request(
    path: string,
    { query = {}, revalidate = 3600 }: RequestOptions = {},
  ): Promise<unknown> {
    const token = getToken()?.trim();
    if (!token || token === "your_actual_token_here")
      throw new TMDBError("CONFIGURATION");
    if (
      !/^\/[a-zA-Z0-9_/-]+$/.test(path) ||
      path.includes("..") ||
      !Number.isInteger(revalidate) ||
      revalidate < 0
    )
      throw new TMDBError("INVALID_REQUEST");
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    url.searchParams.set("language", "en-US");
    for (const [key, value] of Object.entries(query))
      if (value !== undefined) url.searchParams.set(key, String(value));
    try {
      const response = await (fetcher ?? fetch)(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
        ...(revalidate === 0
          ? { cache: "no-store" as const }
          : { cache: "force-cache" as const, next: { revalidate } }),
      });
      if (!response.ok) throw errorFromStatus(response.status);
      try {
        return await response.json();
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "TimeoutError" || error.name === "AbortError")
        )
          throw error;
        throw new TMDBError("INVALID_RESPONSE");
      }
    } catch (error) {
      if (error instanceof TMDBError) throw error;
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      )
        throw new TMDBError("TIMEOUT");
      throw new TMDBError("UNAVAILABLE");
    }
  };
}
export const tmdbRequest = createTMDBClient({
  getToken: () => process.env.TMDB_READ_ACCESS_TOKEN,
});
