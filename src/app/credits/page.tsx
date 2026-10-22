import { RouteTransition } from "@/components/layout/route-transition";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
export const metadata = {
  title: "Credits and attribution",
  description: "TMDB data and image attribution for BryxTV.",
};
export default function Credits() {
  return (
    <RouteTransition>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader active="Home" />
      <main id="main" className="credits-page">
        <Link href="/" className="back-link">
          ← Back to collection
        </Link>
        <h1>Credits & attribution</h1>
        <a
          className="tmdb-credit"
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noreferrer"
        >
          <Image src="/tmdb-logo.svg" alt="TMDB" width={120} height={16} />
        </a>
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        <p>
          Movie and TV metadata, artwork, cast information, trailer references,
          and recommendations are provided by{" "}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            The Movie Database (TMDB)
          </a>
          . Artwork belongs to its respective rights holders. Community scores
          and popularity reflect TMDB data and may change.
        </p>
        <p>
          The Disney collection uses production credits from Walt Disney
          Pictures (company 2), Pixar (company 3), and Walt Disney Animation
          Studios (company 6125), verified against TMDB’s company records. It
          does not describe Disney+ availability or imply a relationship with
          Disney.
        </p>
        <p>
          Anime discovery combines Japanese original language with the Animation
          genre. Korean dramas use Korean-language TV with the Drama genre.
          These filters are discovery aids, not a claim of a complete catalog.
        </p>
        <p>
          BryxTV currently offers entertainment discovery only. It does not
          provide full movie or series playback. Official YouTube trailers, when
          available, are clearly labeled and loaded only when requested.
        </p>
        <p>
          <a
            href="https://www.themoviedb.org/about/logos-attribution"
            target="_blank"
            rel="noreferrer"
          >
            TMDB logos and attribution guidelines ↗
          </a>
        </p>
      </main>
      <SiteFooter />
    </RouteTransition>
  );
}
