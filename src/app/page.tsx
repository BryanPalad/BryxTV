import Link from "next/link";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MovieCard } from "@/features/catalog/components/movie-card";
import { mockTitles } from "@/features/catalog/data/mock-titles";
import { categories, type Category } from "@/constants/site";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const active: Category =
    categories.find((category) => category === params.category) ?? "Home";
  const titles =
    active === "Home"
      ? mockTitles
      : mockTitles.filter((title) => title.category === active);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader active={active} />
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-art" aria-hidden="true">
            <div className="planet" />
            <div className="horizon" />
            <div className="mountain mountain-back" />
            <div className="mountain" />
            <div className="traveler" />
          </div>
          <div className="hero-content">
            <p className="eyebrow">
              <span /> A WORLD OF STORIES AWAITS
            </p>
            <p className="featured-label">
              FEATURED COLLECTION <span>01 / 06</span>
            </p>
            <h1 id="hero-title">
              Every Story.
              <br />
              <span>One Screen.</span>
            </h1>
            <p className="hero-description">
              Faraway worlds. Unforgettable characters. Your next obsession.
              <br className="hidden md:block" /> Find a little of everything you
              love, all in one place.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <Link href="#trending">
                  Explore the collection <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <a href="#featured-story" className="secondary-link">
                Discover the featured story{" "}
                <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <div className="hero-genres">
              <span>MOVIES</span>
              <i />
              <span>SERIES</span>
              <i />
              <span>ANIME</span>
              <i />
              <span>& MORE</span>
            </div>
          </div>
          <div id="featured-story" className="featured-story">
            <span className="story-line" />
            <div>
              <p>IN THE SPOTLIGHT</p>
              <h2>Echoes of Tomorrow</h2>
              <span>2026 · Sci-fi / Adventure · PG-13</span>
              <p className="spotlight-description">
                One signal from the stars changes everything. A fictional story
                from our preview collection.
              </p>
            </div>
          </div>
          <span className="hero-index" aria-hidden="true">
            01 <span>/ 06</span>
          </span>
        </section>
        <section
          id="trending"
          className="catalog-section"
          aria-labelledby="catalog-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Sparkles size={13} aria-hidden="true" /> YOUR NEXT GREAT FIND
              </p>
              <h2 id="catalog-title">
                {active === "Home" ? "Trending now" : active}
                <span className="text-primary">.</span>
              </h2>
            </div>
            <span className="collection-count">
              {titles.length} stories to discover
            </span>
          </div>
          <div className="movie-grid">
            {titles.map((title, index) => (
              <MovieCard key={title.id} title={title} index={index} />
            ))}
          </div>
          <div className="collection-note">
            <span className="text-primary">✦</span>
            <p>
              A first look at something bigger.
              <span>
                {" "}
                This is our preview collection. More stories are on the horizon.
              </span>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
