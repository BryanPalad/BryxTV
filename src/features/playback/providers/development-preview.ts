import "server-only";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import type { PlaybackTarget } from "@/types/playback";
import { developmentPreviewOption, previewAllowed } from "./policy";
export async function resolveDevelopmentPreview(target: PlaybackTarget, sourceId: string) {
  if (process.env.NODE_ENV !== "development" || !/^[a-zA-Z0-9-]{1,100}$/.test(sourceId)) return null;
  const host = (await headers()).get("host") ?? "";
  if (!previewAllowed(process.env.NODE_ENV, host, true)) return null;
  const session = await getSession();
  if (!previewAllowed(process.env.NODE_ENV, host, !!session)) return null;
  const row = await getPrisma().playbackSource.findUnique({ where: { id: sourceId }, include: { provider: true } });
  return row ? developmentPreviewOption(row, target) : null;
}
