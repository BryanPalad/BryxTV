import { BrandLogo } from "@/components/branding/brand-logo";
import Link from "next/link";
import { Bookmark, UserRound } from "lucide-react";
import { categories, categoryHref, type Category } from "@/constants/site";
import { MobileNavigation } from "./mobile-navigation";
import { SearchTrigger } from "@/features/catalog/components/search-trigger";

export function SiteHeader({ active }: { active: Category }) {
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
        </nav>
        <div className="header-actions">
          <SearchTrigger />
          <button
            className="icon-button watchlist-placeholder"
            disabled
            aria-label="Watchlist — coming soon"
            title="Watchlist coming soon"
          >
            <Bookmark size={20} />
          </button>
          <button
            className="profile-placeholder"
            disabled
            aria-label="User profile — sign-in coming soon"
            title="Sign-in coming soon"
          >
            <UserRound size={18} />
          </button>
          <MobileNavigation active={active} />
        </div>
      </div>
    </header>
  );
}
