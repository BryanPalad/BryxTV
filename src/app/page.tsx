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
    {
      id: "trending",
      title: "Trending Now",
      description: "The movies making waves this week.",
      category: "Movies" as const,
      index: 0,
    },
    {
      id: "now-playing",
      title: "Now Playing in Theaters",
      description: "Discover current theatrical releases.",
      category: "Movies" as const,
      index: 1,
    },
    {
      id: "popular-movies",
      title: "Popular Movies",
      description: "Find your next great film.",
      category: "Movies" as const,
      index: 2,
    },
    {
      id: "top-rated",
      title: "Top Rated Movies",
      description: "Favorites from the TMDB community.",
      category: "Movies" as const,
      index: 3,
    },
    {
      id: "popular-series",
      title: "Popular TV Series",
      description: "Your next one-more-episode obsession.",
      category: "TV Series" as const,
      index: 1,
    },
    {
      id: "anime-spotlight",
      title: "Anime Spotlight",
      description: "Japanese animation. Extraordinary imagination.",
      category: "Anime" as const,
      index: 0,
    },
    {
      id: "korean-dramas",
      title: "Korean Dramas",
      description: "Korean-language television with a story to tell.",
      category: "K-Drama" as const,
      index: 0,
    },
    {
      id: "disney-collection",
      title: "Disney Collection",
      description:
        "From Walt Disney Pictures, Pixar, and Disney Animation. Production credits, not Disney+ availability.",
      category: "Disney" as const,
      index: 0,
    },
  ];
  const rows = await Promise.all(
    definitions.map(async (definition) => {
      const collection = collections[definition.category][definition.index]!;
      return {
        ...definition,
        collection,
        result: await catalogResult(() => collection.load(1)),
      };
    }),
  );
  const trending = rows[0]?.result;
  const featured = trending?.ok
    ? trending.data.items.filter((item) => item.backdropUrl).slice(0, 5)
    : [];
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
