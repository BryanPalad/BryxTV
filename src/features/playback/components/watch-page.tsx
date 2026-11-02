import { EpisodeNavigation } from "./episode-navigation";
import { OfficialViewing } from "./official-viewing";
import { officialSources } from "../providers/official-sources.server";
import { resolveDevelopmentPreview } from "../providers/development-preview";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { demoSources } from "@/lib/playback/resolver";
import { episodeParam } from "@/lib/playback/validation";
import { validateId } from "@/lib/providers/tmdb/validation";
import {
  getMovieDetails,
  getTVDetails,
  getRecommendations,
  catalogResult,
} from "@/lib/providers/tmdb/service";
import { getTVEpisodes } from "@/lib/providers/tmdb/episodes";
import { MediaCard } from "@/features/catalog/components/media-card";
import { SourceSelector } from "./source-selector";
import { resolveSources } from "../providers/resolver";
import { playbackKey } from "@/lib/playback/validation";
import { EpisodeSelector } from "./episode-selector";
import type { SearchParams } from "@/types/catalog";
export async function WatchPage({
  type,
  id,
  query = {},
}: {
  type: "movie" | "tv" | "demo";
  id: string;
  query?: SearchParams;
}) {
  const demo = type === "demo";
  if (demo ? !/^[a-z0-9-]+$/.test(id) : !/^[1-9]\d*$/.test(id)) notFound();
  if (!demo) {
    try {
      validateId(id);
    } catch {
      notFound();
    }
  }
  const season = type === "tv" ? episodeParam(query.season, 0) : undefined;
  const episode = type === "tv" ? episodeParam(query.episode) : undefined;
  const validEpisode = type !== "tv" || (season !== null && episode !== null);
  const mediaId = demo ? `demo:${id}` : `tmdb:${type}:${id}`;
  const target = { mediaId, season: season ?? undefined, episode: episode ?? undefined };
  const resolution = validEpisode ? await resolveSources(target) : { sources: [], pending: false, failed: false, unavailable: false };
  const preview = validEpisode && typeof query.preview === "string" ? await resolveDevelopmentPreview(target, query.preview) : null;
  if (preview) resolution.sources = [preview];
  const source = resolution.sources[0];
  if (demo && !source) notFound();
  const details = demo
    ? null
    : await catalogResult(() =>
        type === "movie" ? getMovieDetails(id) : getTVDetails(id),
      );
  const recommendations = demo
    ? null
    : await catalogResult(() => getRecommendations(type, id));
  const episodes =
    type === "tv" && validEpisode
      ? await catalogResult(() => getTVEpisodes(id, season!))
      : null;
  const currentEpisode = episodes?.ok
    ? episodes.data.find((e) => e.number === episode)
    : null;
  const title = details?.ok ? details.data.title : demo ? source?.label ?? "Playback demo" : `${type === "movie" ? "Movie" : "TV series"} #${id}`;
  return (
    <div className="watch-layout">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader active={type === "tv" ? "TV Series" : "Movies"} />
      <main id="main" className="watch-page">
        <Link className="back-link" href={demo ? "/demos" : `/${type}/${id}`}>
          ← {demo ? "Back to playback demos" : "Back to details"}
        </Link>
        <h1>{title}</h1>
        {type === "tv" && validEpisode && (
          <h2>
            Season {season} · Episode {episode}
            {currentEpisode ? ` — ${currentEpisode.title}` : ""}
          </h2>
        )}
        {source ? (
          <SourceSelector sources={resolution.sources} targetKey={playbackKey(target)} restart={query.restart === "1"} preferredId={typeof query.source === "string" ? query.source : undefined} />
        ) : (
          <section className="playback-notice">
            <div>
              <h2>{resolution.pending ? "Playback pending verification" : "Video Not Available"}</h2>
              <p>
                {resolution.failed ? "Playback sources could not be loaded. Please reload to retry." : resolution.pending ? "Sources are awaiting playback verification. They are not yet available to play." : "No approved, verified playback source is currently available for this title."}
              </p>
              {!validEpisode && (
                <p>Select a season and episode below to check availability.</p>
              )}
            </div>
          </section>
        )}
        {!source && !demo && <OfficialViewing rows={officialSources(type as "movie" | "tv",Number(id),season ?? undefined,episode ?? undefined)} pending={resolution.pending} />}
        {type === "movie" && id === "74890" && source?.provider === "Internet Archive" && <aside className="playback-attribution"><p>Valkaama (2010) — Tim Baumann and the Valkaama team. Full film hosted by Internet Archive.</p><p><a href="https://www.valkaama.com/index.php?l=en&page=movie" target="_blank" rel="noreferrer">Creator and original release</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a> · <a href="https://archive.org/details/valkaama" target="_blank" rel="noreferrer">Hosted copy</a>. Embedded unchanged; no video files stored by BryxTV.</p></aside>}
        {type === "tv" && validEpisode && <EpisodeNavigation id={id} season={season!} episode={episode!} />}
        <p className="watch-description">
          {currentEpisode?.description ||
            source?.video?.description ||
            (details?.ok
              ? details.data.overview
              : "Metadata is temporarily unavailable.")}
        </p>
        {type === "tv" && (
          <EpisodeSelector
            id={id}
            selected={query.season}
            pathname={`/watch/tv/${id}`}
          />
        )}
        <section className="detail-section">
          <h2>{demo ? "More playback demos" : "Related content"}</h2>
          {demo ? (
            <ul>
              {demoSources()
                .filter((s) => s.mediaId !== mediaId)
                .map((s) => (
                  <li key={s.id}>
                    <Link href={`/watch/demo/${s.mediaId.slice(5)}`}>
                      {s.title}
                    </Link>
                  </li>
                ))}
              <li>
                <Link href="/movies">Explore the movie catalog</Link>
              </li>
            </ul>
          ) : recommendations?.ok ? (
            <div className="watch-related">
              {recommendations.data.items.slice(0, 6).map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p>Related titles are temporarily unavailable.</p>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
