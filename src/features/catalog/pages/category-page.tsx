import { RouteTransition } from "@/components/layout/route-transition";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  collections,
  type BrowseCategory,
} from "@/lib/providers/tmdb/collections";
import { catalogResult } from "@/lib/providers/tmdb/service";
import { validatePage } from "@/lib/providers/tmdb/validation";
import { categoryHref } from "@/constants/site";
import { MediaCard } from "../components/media-card";
import { CatalogState } from "../components/catalog-state";
import { Pagination } from "../components/pagination";
import type { SearchParams } from "@/types/catalog";

export function categoryMetadata(category: BrowseCategory): Metadata {
  return {
    title: category,
    description:
      category === "Disney"
        ? "Discover movies produced by Walt Disney Pictures, Pixar, and Walt Disney Animation Studios. Production credits, not Disney+ availability."
        : `Explore ${category} on BryxTV. Discover trending titles, ratings, cast, and official trailers, powered by TMDB.`,
  };
}
export async function CategoryPage({
  category,
  searchParams,
}: {
  category: BrowseCategory;
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  let page: number;
  try {
    page = validatePage(params.page ?? 1);
  } catch {
    notFound();
  }
  const choices = collections[category];
  const selected =
    params.collection === undefined
      ? choices[0]
      : choices.find((choice) => choice.key === params.collection);
  if (!selected) notFound();
  const result = await catalogResult(() => selected.load(page));
  if (result.ok && page > Math.max(1, result.data.totalPages)) notFound();
  const path = categoryHref(category);
  return (
    <RouteTransition>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader active={category} />
      <main id="main" className="browse-page">
        <div className="browse-heading">
          <p className="detail-category">Explore the collection</p>
          <h1>{category === "Disney" ? "Disney Collection" : category}</h1>
          <p>
            {category === "Disney"
              ? "Movies produced by Walt Disney Pictures, Pixar, and Walt Disney Animation Studios. These production credits do not indicate availability on Disney+."
              : category === "Anime"
                ? "Japanese-language animation, across movies and television."
                : category === "K-Drama"
                  ? "Korean-language TV dramas. Find your next great series."
                  : "Fresh discoveries and unforgettable stories, powered by TMDB."}
          </p>
        </div>
        <nav className="collection-tabs" aria-label={`${category} collections`}>
          {choices.map((choice) => (
            <Link
              key={choice.key}
              href={`${path}?collection=${choice.key}`}
              aria-current={selected.key === choice.key ? "page" : undefined}
            >
              {choice.title}
            </Link>
          ))}
        </nav>
        <h2 className="browse-section-title">{selected.title}</h2>
        {!result.ok ? (
          <CatalogState
            title="Collection unavailable"
            message={result.message}
            href={`${path}?collection=${selected.key}&page=${page}`}
          />
        ) : result.data.items.length === 0 ? (
          <CatalogState
            title="No titles found"
            message="Try another collection or check back soon."
          />
        ) : (
          <>
            <div className="browse-grid">
              {result.data.items.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
            <Pagination
              path={path}
              params={params}
              page={result.data.page}
              totalPages={result.data.totalPages}
            />
          </>
        )}
      </main>
      <SiteFooter />
    </RouteTransition>
  );
}
