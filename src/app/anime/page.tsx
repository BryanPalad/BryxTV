import {
  CategoryPage,
  categoryMetadata,
} from "@/features/catalog/pages/category-page";
import type { SearchParams } from "@/types/catalog";
export const metadata = categoryMetadata("Anime");
export default function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <CategoryPage category="Anime" searchParams={searchParams} />;
}
