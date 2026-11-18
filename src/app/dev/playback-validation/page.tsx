import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PlayerLoader } from "@/features/playback/components/player-loader";
import { PlaybackAttribution } from "@/features/playback/components/playback-attribution";
import { validationSource } from "@/features/playback/development/validation-source";

export const dynamic = "force-dynamic";
export default async function PlaybackValidation({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const source = validationSource(process.env, (await headers()).get("host") ?? "");
  if (!source) notFound();
  const mode = (await searchParams).mode;
  const unavailable = mode === "unavailable";
  const selected = mode === "error" ? { ...source, id: `${source.id}-error`, sourceUrl: "/playback/validation-missing.mp4" } : source;
  return <main className="watch-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
    <h1>Development-only playback validation</h1>
    <p>Big Buck Bunny (2008) · complete film · 9:56.566 · official Blender MP4</p>
    <p>Local test only. This film is not part of the anime catalog. Gate F remains NO-GO for family rollout.</p>
    <nav aria-label="Playback validation cases" style={{ display: "flex", flexWrap: "wrap", gap: 16, margin: "20px 0" }}>
      <Link href="/dev/playback-validation">Complete film</Link>
      <Link href="/dev/playback-validation?mode=unavailable">Unavailable case</Link>
      <Link href="/dev/playback-validation?mode=error">Media error case</Link>
    </nav>
    {unavailable ? <section role="status"><h2>This test film is currently unavailable</h2><p>No player is mounted for this case. Choose Complete film to retry.</p></section> : <PlayerLoader source={selected} />}
    <PlaybackAttribution source={source} />
    <p><a href="https://peach.blender.org/about/">Official publisher license and attribution requirements</a></p>
  </main>;
}
