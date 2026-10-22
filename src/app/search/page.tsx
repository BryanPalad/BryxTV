import { RouteTransition } from "@/components/layout/route-transition";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SearchForm } from "@/features/catalog/components/search-form";
import { MediaCard } from "@/features/catalog/components/media-card";
import { CatalogState } from "@/features/catalog/components/catalog-state";
import { CatalogSkeleton } from "@/features/catalog/components/catalog-skeleton";
import { Pagination } from "@/features/catalog/components/pagination";
import { searchMulti, catalogResult } from "@/lib/providers/tmdb/service";
import {
  validatePage,
  validateSearchQuery,
} from "@/lib/providers/tmdb/validation";
import type { SearchParams } from "@/types/catalog";
export const metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};
async function SearchResults({
  query,
  page,
  params,
}: {
  query: string;
  page: number;
  params: SearchParams;
}) {
  const result = await catalogResult(() => searchMulti(query, page));
  if (result.ok && page > Math.max(1, result.data.totalPages)) notFound();
  if (!result.ok)
    return (
      <CatalogState
        title="Search unavailable"
        message={result.message}
        href={`/search?q=${encodeURIComponent(query)}&page=${page}`}
      />
    );
  if (result.data.items.length === 0)
    return (
      <>
        <CatalogState
          title="No movies or series found"
          message={`Try another title or check the spelling of “${query}”.`}
        />
        <Pagination
          path="/search"
          params={{ ...params, q: query }}
          page={result.data.page}
          totalPages={result.data.totalPages}
        />
      </>
    );
  return (
    <>
      <p className="results-summary" role="status">
        Movie and TV results for “{query}” · Page {result.data.page}
      </p>
      <div className="browse-grid">
        {result.data.items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
      <Pagination
        path="/search"
        params={{ ...params, q: query }}
        page={result.data.page}
        totalPages={result.data.totalPages}
      />
    </>
  );
}
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  let query = "",
    page = 1,
    validationMessage = "";
  try {
    query = validateSearchQuery(params.q);
    page = validatePage(params.page ?? 1);
  } catch {
    validationMessage =
      "Enter a search of up to 100 characters and a page number from 1 to 500.";
  }
  return (
    <RouteTransition>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader active="Home" />
      <main id="main" className="browse-page">
        <div className="browse-heading">
          <h1>Find your next story</h1>
          <p>Search movies and TV series from around the world.</p>
        </div>
        <SearchForm initialQuery={query} />
        {validationMessage ? (
          <CatalogState title="Check your search" message={validationMessage} />
        ) : !query ? (
          <CatalogState
            title="A world of stories awaits"
            message="Enter a movie or TV title to start exploring."
          />
        ) : (
          <Suspense key={`${query}:${page}`} fallback={<CatalogSkeleton />}>
            <SearchResults query={query} page={page} params={params} />
          </Suspense>
        )}
      </main>
      <SiteFooter />
    </RouteTransition>
  );
}
