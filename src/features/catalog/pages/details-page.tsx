import { OfficialViewing } from "@/features/playback/components/official-viewing";
import { officialSources } from "@/features/playback/providers/official-sources.server";
import { viewingState } from "@/features/playback/providers/official-policy";
import { DetailProgress } from "@/features/history/components/detail-progress";
import { Suspense } from "react";
import { WatchlistButton } from "@/features/watchlist/components/watchlist-button";
import { RouteTransition } from "@/components/layout/route-transition";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, Star } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MediaPoster } from "../components/media-poster";
import { MediaCard } from "../components/media-card";
import { ContentRow } from "../components/content-row";
import { SectionHeading } from "../components/section-heading";
import { TrailerPlayer } from "../components/trailer-player";
import { CatalogState } from "../components/catalog-state";
import * as tmdb from "@/lib/providers/tmdb/service";
import { TMDBError, catalogErrorMessage } from "@/lib/providers/tmdb/errors";
import { validateId } from "@/lib/providers/tmdb/validation";
import { selectTrailer } from "@/lib/providers/tmdb/normalize";
import { titleAvailability } from "@/features/playback/providers/resolver";
import { EpisodeSelector } from "@/features/playback/components/episode-selector";
import type { SearchParams } from "@/types/catalog";
import type { MediaType } from "@/types/catalog";

async function loadTitle(type: MediaType, id: string) {
  try {
    validateId(id);
  } catch {
    notFound();
  }
  try {
    return await (type === "movie"
      ? tmdb.getMovieDetails(id)
      : tmdb.getTVDetails(id));
  } catch (error) {
    if (error instanceof TMDBError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
export async function detailsMetadata(
  type: MediaType,
  params: Promise<{ id: string }>,
): Promise<Metadata> {
  try {
    const item = await loadTitle(type, (await params).id);
    return {
      title: item.title,
      description: item.overview,
      openGraph: {
        title: item.title,
        description: item.overview,
        ...(item.backdropUrl
          ? { images: [{ url: item.backdropUrl, alt: item.title }] }
          : {}),
      },
    };
  } catch (error) {
    if (error instanceof TMDBError)
      return { title: "Title unavailable", robots: { index: false } };
    throw error;
  }
}
export async function DetailsPage({
  type,
  params,
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
  type: MediaType;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let item;
  try {
    item = await loadTitle(type, id);
  } catch (error) {
    if (!(error instanceof TMDBError)) throw error;
    return (
      <RouteTransition>
        <SiteHeader active={type === "movie" ? "Movies" : "TV Series"} />
        <main id="main" className="browse-page">
          <CatalogState
            title="Title unavailable"
            message={catalogErrorMessage(error)}
            href={`/${type}/${id}`}
          />
        </main>
        <SiteFooter />
      </RouteTransition>
    );
  }
  const [credits, videos, recommendations] = await Promise.all([
    tmdb.catalogResult(() =>
      type === "movie" ? tmdb.getMovieCredits(id) : tmdb.getTVCredits(id),
    ),
    tmdb.catalogResult(() =>
      type === "movie" ? tmdb.getMovieVideos(id) : tmdb.getTVVideos(id),
    ),
    tmdb.catalogResult(() => tmdb.getRecommendations(type, id)),
  ]);
  const query = searchParams ? await searchParams : {};
  const availability = await titleAvailability(type, Number(id));
  const source = availability.sources[0];
  const official = officialSources(type,Number(id));
  const state = viewingState(!!source,official,availability.pendingKeys.length > 0 || availability.failed);
  const trailer = videos.ok ? selectTrailer(videos.data) : null;
  return (
    <RouteTransition>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader active={type === "movie" ? "Movies" : "TV Series"} />
      <main id="main">
        <div className="details-backdrop">
          <MediaPoster
            src={item.backdropUrl}
            title={item.title}
            backdrop
            preload
          />
          <div className="details-scrim" />
        </div>
        <div className="detail-page live-details">
          <Link
            href={type === "movie" ? "/movies" : "/tv"}
            className="back-link"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to{" "}
            {type === "movie" ? "movies" : "series"}
          </Link>
          <div className="detail-layout">
            <div className="detail-poster">
              <MediaPoster src={item.posterUrl} title={item.title} />
            </div>
            <div className="detail-copy">
              <p className="detail-category">
                {item.mediaType === "movie" ? "Movie" : "TV Series"}
              </p>
              <h1>{item.title}</h1>
              {item.originalTitle && item.originalTitle !== item.title && (
                <p className="original-title">{item.originalTitle}</p>
              )}
              <div className="detail-meta">
                <span>{item.releaseDate ?? "Release date unavailable"}</span>
                <span>{item.genres.join(" / ") || "Genres unavailable"}</span>
                {item.runtime && (
                  <span>
                    {Math.floor(item.runtime / 60)
                      ? `${Math.floor(item.runtime / 60)}h `
                      : ""}
                    {item.runtime % 60}m
                  </span>
                )}
                {item.seasons !== null && (
                  <span>
                    {item.seasons} {item.seasons === 1 ? "season" : "seasons"}
                    {item.episodes !== null
                      ? ` · ${item.episodes} episodes`
                      : ""}
                  </span>
                )}
              </div>
              <p className="detail-score">
                {item.rating !== null ? (
                  <>
                    <Star size={17} aria-hidden="true" />{" "}
                    {item.rating.toFixed(1)} / 10{" "}
                    <span>
                      ({item.voteCount.toLocaleString("en-US")} votes on TMDB)
                    </span>
                  </>
                ) : (
                  "Not yet rated"
                )}
              </p>
              <p className="detail-description">{item.overview}</p>
              <WatchlistButton tmdbId={item.externalId} mediaType={item.mediaType} title={item.title} />
              <OfficialViewing rows={official} playable={!!source} pending={availability.pendingKeys.length > 0 || availability.failed} />
              {source ? (
                <Suspense fallback={<Link className="playback-button" href={type === "movie" ? `/watch/movie/${id}` : `/watch/tv/${id}?season=${source.seasonNumber}&episode=${source.episodeNumber}`}>Watch Now</Link>}>
                  <DetailProgress mediaType={type} tmdbId={Number(id)} fallbackHref={type === "movie" ? `/watch/movie/${id}` : `/watch/tv/${id}?season=${source.seasonNumber}&episode=${source.episodeNumber}`} />
                </Suspense>
              ) : (
                <>
                <Suspense fallback={null}><DetailProgress mediaType={type} tmdbId={Number(id)} /></Suspense>
                {state === "UNAVAILABLE" && <aside className="playback-notice">
                  <Info size={20} aria-hidden="true" />
                  <div>
                    <h2>{availability.pendingKeys.length > 0 ? "Playback pending verification" : "Video Not Available"}</h2>
                    <p>
                      {availability.pendingKeys.length > 0 ? "Sources are awaiting playback verification." : availability.failed ? "Playback sources are temporarily unavailable. Please try again later." : "No approved playback source is available for this title on BryxTV."}
                    </p>
                  </div>
                </aside>}
                </>
              )}
            </div>
          </div>
          {type === "tv" && (
            <EpisodeSelector
              id={id}
              selected={query.season}
              pathname={`/tv/${id}`}
            />
          )}
          <section className="detail-section" aria-labelledby="cast-heading">
            <h2 id="cast-heading">Cast</h2>
            {!credits.ok ? (
              <p className="section-message">
                Cast information is temporarily unavailable.
              </p>
            ) : credits.data.length === 0 ? (
              <p className="section-message">
                Cast information is not available.
              </p>
            ) : (
              <ul className="cast-row">
                {credits.data.map((person) => (
                  <li key={person.id}>
                    <div className="cast-photo">
                      <MediaPoster
                        src={person.profileUrl}
                        title={person.name}
                        profile
                      />
                    </div>
                    <strong>{person.name}</strong>
                    <span>{person.character}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="detail-section" aria-labelledby="trailer-heading">
            <h2 id="trailer-heading">Official trailer</h2>
            {!videos.ok ? (
              <p className="section-message">
                Trailer information is temporarily unavailable.
              </p>
            ) : trailer ? (
              <TrailerPlayer trailer={trailer} />
            ) : (
              <p className="section-message">
                An official supported trailer is not available for this title.
              </p>
            )}
          </section>
        </div>
        <div className="catalog-content">
          <ContentRow
            id="recommendations"
            heading={
              <SectionHeading id="recommendations" title="More like this" />
            }
          >
            {!recommendations.ok ? (
              <CatalogState
                title="Recommendations unavailable"
                message={recommendations.message}
              />
            ) : recommendations.data.items.length === 0 ? (
              <CatalogState
                title="More stories on the horizon"
                message="There are no recommendations for this title yet."
              />
            ) : (
              recommendations.data.items.map((related) => (
                <MediaCard key={related.id} item={related} />
              ))
            )}
          </ContentRow>
        </div>
      </main>
      <SiteFooter />
    </RouteTransition>
  );
}
