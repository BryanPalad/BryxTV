import type { Category } from "@/constants/site";
export interface CatalogTitle {
  id: string;
  title: string;
  category: Exclude<Category, "Home">;
  year: number;
  rating: string;
  genre: string;
  description: string;
  artwork: string;
}
