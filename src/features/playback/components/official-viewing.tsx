import {
  officialProviders,
  officialSourceEligible,
  officialWatchUrl,
  viewingState,
  officialEmbedReady,
  type OfficialSource,
} from "../providers/official-policy";
export function OfficialViewing({
  rows,
  playable = false,
  pending = false,
  compact = false,
}: {
  rows: OfficialSource[];
  playable?: boolean;
  pending?: boolean;
  compact?: boolean;
}) {
  rows = rows.filter((row) => row.enabled && officialSourceEligible(row));
  const state = viewingState(playable, rows, pending);
  if (compact) {
    const external =
      state === "WATCH_ON_PROVIDER"
        ? rows.find(
            (row) =>
              row.status === "WATCH_ON_PROVIDER" &&
              row.uploaderVerified &&
              row.mappingVerified &&
              row.embedding !== "UNKNOWN" &&
              row.region !== "RESTRICTED_PH",
          )
        : null;
    return (
      <div className="episode-availability" data-availability={state}>
        <span className="episode-unavailable">
          {state === "WATCH_ON_BRYXTV"
            ? "Watch on BryxTV"
            : state === "WATCH_ON_PROVIDER"
              ? "Official provider"
              : state === "UNKNOWN"
                ? "Availability under review"
                : "Video Not Available"}
        </span>
        {external && (
          <a
            className="playback-button secondary"
            href={officialWatchUrl(external)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch on {officialProviders[external.provider].name} ↗
            <span className="sr-only"> (opens a new tab)</span>
          </a>
        )}
      </div>
    );
  }
  return (
    <section
      className="official-viewing"
      aria-label="Viewing availability"
      data-availability={state}
    >
      <p className="viewing-status">
        {state === "WATCH_ON_BRYXTV"
          ? "Watch on BryxTV"
          : state === "WATCH_ON_PROVIDER"
            ? "Watch on the official provider"
            : state === "UNKNOWN"
              ? "Viewing source under review"
              : "No verified viewing source"}
      </p>
      {rows.map((row) => (
        <div className="official-viewing-option" key={row.key}>
          <strong>
            {officialProviders[row.provider].name} ·{" "}
            {row.format === "COMPILATION"
              ? "Season compilation · not separate episodes"
              : row.format === "EPISODE"
                ? `Season ${row.season} · Episode ${row.episode}`
                : "Full movie / television special"}
          </strong>
          <p>{row.title}</p>
          <p>
            {row.audioLanguage
              ? `Audio: ${row.audioLanguage}`
              : "Audio language not verified"}{" "}
            ·{" "}
            {row.subtitles.length
              ? `Subtitles: ${row.subtitles.join(", ")}`
              : "Subtitles not verified"}
            {row.durationSeconds
              ? ` · ${Math.floor(row.durationSeconds / 60)} min`
              : ""}
          </p>
          <p>
            {row.region === "AVAILABLE_PH"
              ? "Philippines playback observed at review; availability may change."
              : row.region === "RESTRICTED_PH"
                ? "Restricted in the Philippines at review."
                : "Philippines availability has not been confirmed."}{" "}
            {row.access === "MEMBERSHIP"
              ? "Provider membership required."
              : row.access === "PAID"
                ? "Payment required on provider."
                : row.access === "UNKNOWN"
                  ? "Payment requirements have not been confirmed."
                  : "Public provider listing; advertisements may appear."}
          </p>
          {row.status === "WATCH_ON_PROVIDER" &&
          row.uploaderVerified &&
          row.mappingVerified &&
          row.embedding !== "UNKNOWN" &&
          row.region !== "RESTRICTED_PH" ? (
            <a
              className="playback-button secondary"
              href={officialWatchUrl(row)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch on {officialProviders[row.provider].name} ↗
              <span className="sr-only"> (opens a new tab)</span>
            </a>
          ) : (
            <span>
              {playable && officialEmbedReady(row)
                ? "Available through the approved BryxTV player."
                : "Source verification incomplete. No playback is offered."}
            </span>
          )}
        </div>
      ))}
      {state === "UNAVAILABLE" && (
        <p>This title remains available for discovery and My List.</p>
      )}
    </section>
  );
}
