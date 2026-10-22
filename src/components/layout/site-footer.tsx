import { BrandLogo } from "@/components/branding/brand-logo";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { categories, categoryHref, site } from "@/constants/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Link href="/" className="brand" aria-label="BryxTV home">
            <BrandLogo />
          </Link>
          <p>{site.tagline}</p>
        </div>
        <nav aria-label="Footer navigation">
          {categories
            .filter((category) => category !== "Home")
            .map((category) => (
              <Link key={category} href={categoryHref(category)}>
                {category}
              </Link>
            ))}
        </nav>
        <a className="back-top" href="#main">
          Back to top <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <div className="footer-bottom">
        <small>
          © {new Date().getFullYear()} BryxTV. Built for the love of stories.
        </small>
        <p>Powered by TMDB · Streaming unavailable</p>
        <Link href="/credits">Credits & attribution</Link>
      </div>
    </footer>
  );
}
