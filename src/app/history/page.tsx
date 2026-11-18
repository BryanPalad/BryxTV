import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { historyPage } from "@/features/history/server";
import { HistoryGrid } from "@/features/history/components/history-grid";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RouteTransition } from "@/components/layout/route-transition";
import { Pagination } from "@/features/catalog/components/pagination";
import type { SearchParams } from "@/types/catalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "Viewing History", robots: { index: false, follow: false } };
export default async function History({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=%2Fhistory");
  const params = await searchParams;
  const type = params.type === "movie" || params.type === "tv" || params.type === "demo" ? params.type : undefined;
  const page = typeof params.page === "string" && /^[1-9]\d{0,4}$/.test(params.page) ? Number(params.page) : 1;
  const result = await historyPage(session.user.id, { page, continuing: false, ...(type ? { type } : {}) });
  return <RouteTransition><a className="skip-link" href="#main">Skip to content</a><SiteHeader active="History" /><main id="main" className="browse-page"><div className="browse-heading"><p className="detail-category">Your stories</p><h1>Viewing History</h1><p>Your recent movies, episodes, and demo excerpts. Saved across your devices.</p></div>
    <nav className="collection-tabs" aria-label="Filter viewing history">{([undefined, "movie", "tv", "demo"] as const).map(filter => <Link key={filter ?? "all"} href={filter ? `/history?type=${filter}` : "/history"} aria-current={type === filter ? "page" : undefined}>{filter === "movie" ? "Movies" : filter === "tv" ? "TV Series" : filter === "demo" ? "Demos" : "All titles"}</Link>)}</nav><p className="watchlist-sort">Most recently watched</p><HistoryGrid items={result.items} /><Pagination path="/history" params={params} page={result.page} totalPages={result.totalPages} /></main><SiteFooter /></RouteTransition>;
}
