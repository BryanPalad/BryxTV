import {
  CategoryPage,
  categoryMetadata,
} from "@/features/catalog/pages/category-page";
import type { SearchParams } from "@/types/catalog";
export const metadata = categoryMetadata("K-Drama");
export default function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <CategoryPage category="K-Drama" searchParams={searchParams} />;
}
