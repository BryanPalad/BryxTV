import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { presentProgress } from "../server";
/** Personalized server content; never offer playback for an unavailable source. */
export async function DetailProgress({ mediaType, tmdbId, fallbackHref }: { mediaType: "movie" | "tv"; tmdbId: number; fallbackHref?: string }) {
  const fallback = fallbackHref ? <Link className="playback-button" href={fallbackHref}>Watch Now</Link> : null;
  let item;
  try {
    const session = await getSession();
    if (!session) return fallback;
    const row = await getPrisma().viewingProgress.findFirst({ where: { userId: session.user.id, mediaType, tmdbId }, orderBy: [{ lastWatchedAt: "desc" }, { id: "desc" }] });
    if (!row) return fallback;
    item = await presentProgress(row);
  } catch { return <>{fallback}<p className="detail-viewing-progress">Saved progress is temporarily unavailable.</p></>; }
  const position = `${Math.floor(item.positionSeconds / 60)}:${String(Math.floor(item.positionSeconds % 60)).padStart(2, "0")}`;
  return <div className="detail-viewing-progress"><p>{mediaType === "tv" ? `Season ${item.seasonNumber}, Episode ${item.episodeNumber} · ` : ""}{item.completed ? "Completed" : `Last watched at ${position}`}</p>
    {item.watchHref ? <div className="history-detail-actions">{!item.completed && item.positionSeconds > 0 && <Link className="playback-button" href={item.watchHref}>Resume Watching</Link>}<Link className="playback-button secondary" href={`${item.watchHref}${item.watchHref.includes("?") ? "&" : "?"}restart=1`}>Restart from Beginning</Link></div> : fallback}
  </div>;
}
