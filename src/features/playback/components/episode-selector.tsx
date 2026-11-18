import { officialSources } from "../providers/official-sources.server";
import { OfficialViewing } from "./official-viewing";
import Link from "next/link";
import { catalogResult } from "@/lib/providers/tmdb/service";
import { getTVSeasons, getTVEpisodes } from "@/lib/providers/tmdb/episodes";
import { episodeParam } from "@/lib/playback/validation";
import { titleAvailability } from "../providers/resolver";
import { MediaPoster } from "@/features/catalog/components/media-poster";

export async function EpisodeSelector({
  id,
  selected,
  pathname,
}: {
  id: string;
  selected?: string | string[] | undefined;
  pathname: string;
}) {
  const result = await catalogResult(() => getTVSeasons(id));
  if (!result.ok)
    return (
      <section className="detail-section">
        <h2>Episodes</h2>
        <p>
          Episode metadata is temporarily unavailable. Please try again later.
        </p>
      </section>
    );
  const seasons = result.data;
  const requested =
    selected === undefined
      ? (seasons.find((s) => s.number === 1) ?? seasons[0])?.number
      : episodeParam(selected, 0);
  if (
    requested === null ||
    requested === undefined ||
    !seasons.some((s) => s.number === requested)
  )
    return (
      <section className="detail-section">
        <h2>Episodes</h2>
        <p>
          That season is unavailable.{" "}
          <Link href={pathname}>Reset season selection</Link>
        </p>
      </section>
    );
  const episodeResult = await catalogResult(() => getTVEpisodes(id, requested));
  if (!episodeResult.ok)
    return (
      <section className="detail-section">
        <h2>Episodes</h2>
        <p>
          Episode metadata is temporarily unavailable. Please try again later.
        </p>
      </section>
    );
  const episodes = episodeResult.data;
  const availability = await titleAvailability("tv", Number(id));
  const approved = availability.sources;
  return (
    <section className="detail-section" aria-labelledby="episodes-heading">
      <h2 id="episodes-heading">Episodes</h2>
      <form action={pathname} className="season-form">
        <label htmlFor="season">Season</label>
        <select id="season" name="season" defaultValue={requested}>
          {seasons.map((s) => (
            <option key={s.number} value={s.number}>
              {s.name} ({s.episodeCount} episodes)
            </option>
          ))}
        </select>
        <button type="submit" className="playback-button">
          Show episodes
        </button>
      </form>
      <ul className="episode-list">
        {episodes.map((e) => {
          const source = approved.find(row => row.seasonNumber === requested && row.episodeNumber === e.number);
          return (
            <li key={e.number} className="episode-card">
              <div className="episode-image">
                <MediaPoster src={e.thumbnail} title={e.title} backdrop />
              </div>
              <div>
                <h3>
                  {e.number}. {e.title}
                </h3>
                <p>{e.description || "Description unavailable."}</p>
                {e.runtime && <small>{e.runtime} min</small>}
                <div>
                  {source ? (
                    <><Link
                      className="playback-button"
                      href={`/watch/tv/${id}?season=${requested}&episode=${e.number}`}
                    >
                      Watch episode
                    </Link><OfficialViewing compact rows={officialSources("tv",Number(id),requested,e.number)} playable /></>
                  ) : (
                    <OfficialViewing compact rows={officialSources("tv",Number(id),requested,e.number)} pending={availability.failed || availability.pendingKeys.includes(`tv:${id}:${requested}:${e.number}`)} />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {episodes.length === 0 && (
        <p>No episode metadata is available for this season.</p>
      )}
    </section>
  );
}
