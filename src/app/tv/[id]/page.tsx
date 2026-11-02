import type { SearchParams } from "@/types/catalog";
import {
  DetailsPage,
  detailsMetadata,
} from "@/features/catalog/pages/details-page";
export function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return detailsMetadata("tv", params);
}
export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return <DetailsPage type="tv" params={params} searchParams={searchParams} />;
}
