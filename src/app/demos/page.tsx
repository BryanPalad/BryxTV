import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { demoSources } from "@/lib/playback/resolver";
import { PlaybackAttribution } from "@/features/playback/components/playback-attribution";
export const metadata = {
  title: "Playback demos",
  description: "Authorized sample videos for the BryxTV player.",
};
export default function Demos() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader active="Home" />
      <main id="main" className="watch-page">
        <p className="detail-category">Authorized samples</p>
        <h1>Try the BryxTV player</h1>
        <p>
          Independent demonstration videos, separate from the TMDB discovery
          catalog.
        </p>
        {demoSources().map((source) => (
          <section key={source.id} className="detail-section">
            <h2>{source.title}</h2>
            <p>{source.description}</p>
            <Link
              className="playback-button"
              href={`/watch/demo/${source.mediaId.slice(5)}`}
            >
              Watch sample
            </Link>
            <PlaybackAttribution source={source} />
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
