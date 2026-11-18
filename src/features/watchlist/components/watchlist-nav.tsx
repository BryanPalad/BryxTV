"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWatchlist } from "./watchlist-provider";
export function WatchlistNav() {
  const { authenticated } = useWatchlist();
  const pathname = usePathname();
  if (!authenticated) return null;
  return <Link href="/my-list" className="watchlist-nav" aria-current={pathname === "/my-list" ? "page" : undefined}>My List</Link>;
}
