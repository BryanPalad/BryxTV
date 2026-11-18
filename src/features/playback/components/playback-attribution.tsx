import type { PlaybackSource } from "@/types/playback";
export function PlaybackAttribution({ source }: { source: PlaybackSource }) {
  const a = source.attribution;
  return (
    <aside className="playback-attribution">
      <p>
        {a.creator} ·{" "}
        <a href={a.licenseUrl} rel="noreferrer" target="_blank">
          {a.license}
        </a>
      </p>
      <p>{a.changes}</p>
      <p>
        Provider: {a.provider} ·{" "}
        <a href={a.source} rel="noreferrer" target="_blank">
          Original sample source
        </a>{" "}
        ·{" "}
        <a
          href="https://peach.blender.org/about/"
          rel="noreferrer"
          target="_blank"
        >
          Publisher license & credits
        </a>
      </p>
    </aside>
  );
}
