import { watchableCatalog } from "@/features/playback/providers/watchable-catalog";
import { ContinueWatching } from "@/features/history/components/continue-watching";
import { RouteTransition } from "@/components/layout/route-transition";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { HeroCarousel } from "@/features/catalog/components/hero-carousel";
import { ContentRow } from "@/features/catalog/components/content-row";
import { SectionHeading } from "@/features/catalog/components/section-heading";
import { MediaCard } from "@/features/catalog/components/media-card";
import { CatalogState } from "@/features/catalog/components/catalog-state";
import { collections } from "@/lib/providers/tmdb/collections";
import { catalogResult } from "@/lib/providers/tmdb/service";
import { categories, categoryHref } from "@/constants/site";
import type { SearchParams } from "@/types/catalog";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const legacyCategory = categories.find(
    (category) => category === params.category && category !== "Home",
  );
  if (legacyCategory) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (key !== "category" && typeof value === "string")
        query.set(key, value);
    redirect(`${categoryHref(legacyCategory)}${query.size ? `?${query}` : ""}`);
  }
  const definitions = [
    { id: "trending-anime", title: "Trending Anime", description: "Weekly anime discoveries, with popular series when weekly results are sparse.", category: "Anime" as const, collectionKey: "trending" },
    { id: "popular-k-dramas", title: "Popular K-Dramas", description: "Korean stories to discover. Viewing availability is shown on each title.", category: "K-Drama" as const, collectionKey: "popular" },
    { id: "anime-movies", title: "Anime Movies", description: "Japanese animated films, from new discoveries to familiar favorites.", category: "Anime" as const, collectionKey: "movies" },
    { id: "korean-movies", title: "Korean Movies", description: "Explore Korean cinema. Catalog inclusion does not guarantee streaming access.", category: "K-Drama" as const, collectionKey: "movies" },
    { id: "trending", title: "Trending Movies", description: "The movies making waves this week.", category: "Movies" as const, collectionKey: "trending" },
    { id: "now-playing", title: "Now Playing in Theaters", description: "Discover current theatrical releases.", category: "Movies" as const, collectionKey: "now-playing" },
    { id: "popular-movies", title: "Popular Movies", description: "Find your next great film.", category: "Movies" as const, collectionKey: "popular" },
    { id: "top-rated", title: "Top Rated Movies", description: "Favorites from the TMDB community.", category: "Movies" as const, collectionKey: "top-rated" },
    { id: "popular-series", title: "Popular TV Series", description: "More stories from around the world.", category: "TV Series" as const, collectionKey: "popular" },
    { id: "disney-collection", title: "Disney Collection", description: "Disney production credits, not Disney+ availability.", category: "Disney" as const, collectionKey: "popular" },
  ];
  const rows = await Promise.all(
    definitions.map(async (definition) => {
      const collection = collections[definition.category].find(collection => collection.key === definition.collectionKey)!;
      return {
        ...definition,
        collection,
        result: await catalogResult(() => collection.load(1)),
      };
    }),
  );
  const watchable = await watchableCatalog();
  const trending = rows[0]?.result;
  const featured = rows.slice(0,2).flatMap(row => row.result.ok ? row.result.data.items.filter(item => item.backdropUrl).slice(0,3) : []).slice(0,5);
  return (
    <RouteTransition>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader active="Home" />
      <main id="main">
        {featured.length ? (
          <HeroCarousel items={featured} />
        ) : (
          <div className="hero-unavailable">
            <h1>Every Story. One Screen.</h1>
            <CatalogState
              title="Featured titles unavailable"
              message={
                trending && !trending.ok
                  ? trending.message
                  : "New stories will appear here when the catalog is available."
              }
            />
          </div>
        )}
        <div className="catalog-content">
          <ContinueWatching />
          {([{id:"watchable-anime",title:"Watchable Anime",items:watchable.anime},{id:"watchable-k-dramas",title:"Watchable K-Dramas",items:watchable.drama}]).filter(row => row.items.length > 0).map(row => <ContentRow key={row.id} id={row.id} heading={<SectionHeading id={row.id} title={row.title} description="Official episodes verified for playback. Choose a title to see available episodes." />}>
            {row.items.map(item => <MediaCard key={item.id} item={item} />)}
          </ContentRow>)}
          {rows.map((row) => (
            <ContentRow
              key={row.id}
              id={row.id}
              heading={
                <SectionHeading
                  id={row.id}
                  title={row.title}
                  description={row.description}
                  href={`${categoryHref(row.category)}?collection=${row.collection.key}`}
                />
              }
            >
              {!row.result.ok ? (
                <CatalogState
                  title="Collection unavailable"
                  message={row.result.message}
                />
              ) : row.result.data.items.length === 0 ? (
                <CatalogState
                  title="No titles found"
                  message="Please check back for more stories."
                />
              ) : (
                row.result.data.items.map((item, index) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    {...(row.id === "trending" ? { rank: index + 1 } : {})}
                  />
                ))
              )}
            </ContentRow>
          ))}
        </div>
      </main>
      <SiteFooter />
    </RouteTransition>
  );
}
