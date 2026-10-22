import type { MediaItem, SearchParams } from "@/types/catalog";
export function mediaHref(item: Pick<MediaItem, "externalId" | "mediaType">) {
  return `/${item.mediaType}/${item.externalId}`;
}
export function paginatedHref(
  path: string,
  params: SearchParams,
  page: number,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    if (Array.isArray(value))
      value.forEach((entry) => query.append(key, entry));
    else query.set(key, value);
  }
  query.set("page", String(page));
  return `${path}?${query}`;
}
