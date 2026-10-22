import { TMDBError } from "./errors";
import type { MediaType } from "@/types/catalog";

export function validatePage(value: unknown = 1): number {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !/^[1-9]\d*$/.test(String(value))
  )
    throw new TMDBError("INVALID_REQUEST");
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page > 500)
    throw new TMDBError("INVALID_REQUEST");
  return page;
}
export function validateId(value: unknown): number {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !/^[1-9]\d*$/.test(String(value))
  )
    throw new TMDBError("INVALID_REQUEST");
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new TMDBError("INVALID_REQUEST");
  return id;
}
export function validateMediaType(type: unknown): MediaType {
  if (type !== "movie" && type !== "tv") throw new TMDBError("INVALID_REQUEST");
  return type;
}
export function validateSearchQuery(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new TMDBError("INVALID_REQUEST");
  const query = value.trim().replace(/\s+/g, " ");
  if (query.length > 100 || /[\u0000-\u001f\u007f]/.test(query))
    throw new TMDBError("INVALID_REQUEST");
  return query;
}
