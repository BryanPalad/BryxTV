import { WatchlistNav } from "@/features/watchlist/components/watchlist-nav";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { BrandLogo } from "@/components/branding/brand-logo";
import Link from "next/link";
import { categories, categoryHref, type Category } from "@/constants/site";
import { MobileNavigation } from "./mobile-navigation";
import { SearchTrigger } from "@/features/catalog/components/search-trigger";

export function SiteHeader({ active }: { active: Category | "My List" | "History" }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="BryxTV home">
          <BrandLogo />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {categories.map((category) => (
            <Link
              key={category}
              href={categoryHref(category)}
              aria-current={active === category ? "page" : undefined}
            >
              {category}
            </Link>
          ))}
          <WatchlistNav />
        </nav>
        <div className="header-actions">
          <SearchTrigger />
          <AccountMenu />
          <MobileNavigation active={active} />
        </div>
      </div>
    </header>
  );
}
