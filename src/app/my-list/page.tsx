import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RouteTransition } from "@/components/layout/route-transition";
import { Pagination } from "@/features/catalog/components/pagination";
import { watchlistMetadata } from "@/features/watchlist/metadata";
import { SavedGrid } from "@/features/watchlist/components/saved-grid";
import { getMovieDetails, getTVDetails } from "@/lib/providers/tmdb/service";
import type { SearchParams, MediaType } from "@/types/catalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "My List", robots: { index: false, follow: false } };
export default async function MyList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=%2Fmy-list");
  const params = await searchParams;
  const filter: MediaType | undefined = params.type === "movie" || params.type === "tv" ? params.type : undefined;
  const page = typeof params.page === "string" && /^[1-9]\d{0,5}$/.test(params.page) ? Number(params.page) : 1;
  const where = { userId: session.user.id, ...(filter ? { mediaType: filter } : {}) };
  const db = getPrisma();
  const total = await db.watchlistItem.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / 24));
  const selectedPage = Math.min(page, totalPages);
  const records = await db.watchlistItem.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (selectedPage - 1) * 24, take: 24, select: { tmdbId: true, mediaType: true } });
  const titles = await watchlistMetadata(records, title => title.mediaType === "movie" ? getMovieDetails(title.tmdbId) : getTVDetails(title.tmdbId));
  return <RouteTransition>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader active="My List" />
    <main id="main" className="browse-page">
      <div className="browse-heading"><p className="detail-category">Your collection</p><h1>My List</h1><p>Stories for another night. Saved across your devices.</p></div>
      <nav className="collection-tabs" aria-label="Filter My List">
        {([undefined, "movie", "tv"] as const).map(type => <Link key={type ?? "all"} href={type ? `/my-list?type=${type}` : "/my-list"} aria-current={filter === type ? "page" : undefined}>{type === "movie" ? "Movies" : type === "tv" ? "TV Series" : "All titles"}</Link>)}
      </nav>
      <p className="watchlist-sort">Most recently added</p>
      <SavedGrid titles={titles} />
      <Pagination path="/my-list" params={params} page={selectedPage} totalPages={totalPages} />
    </main>
    <SiteFooter />
  </RouteTransition>;
}
