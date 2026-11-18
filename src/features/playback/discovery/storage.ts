import "server-only";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  unlink,
} from "node:fs/promises";
import { join } from "node:path";
import type { APICache } from "./youtube";
import type { Candidate, DiscoveryReport } from "./types";
export async function readJSON<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw new Error(
      "Invalid discovery state; preserve and repair the existing file.",
    );
  }
}
export async function atomicJSON(path: string, data: unknown) {
  await mkdir(join(path, ".."), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", {
    mode: 0o600,
  });
  await rename(temporary, path);
}
export class DiskAPICache implements APICache {
  constructor(
    private readonly directory: string,
    private readonly now = () => Date.now(),
  ) {}
  private path(key: string) {
    return join(
      this.directory,
      createHash("sha256").update(key).digest("hex") + ".json",
    );
  }
  async get(key: string) {
    const path = this.path(key),
      entry = await readJSON<{ expiresAt: number; value: unknown } | null>(
        path,
        null,
      );
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      await unlink(path);
      return undefined;
    }
    return entry.value;
  }
  async set(key: string, value: unknown) {
    await atomicJSON(this.path(key), {
      expiresAt: this.now() + 24 * 3600000,
      value,
    });
  }
  async prune() {
    await mkdir(this.directory, { recursive: true });
    for (const file of await readdir(this.directory)) {
      if (!/^[a-f0-9]{64}\.json$/.test(file)) continue;
      const path = join(this.directory, file),
        entry = await readJSON<{ expiresAt: number } | null>(path, null);
      if (entry && entry.expiresAt <= this.now()) await unlink(path);
    }
  }
}
/** CSV formula injection protection applies even to official API text. */
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function reportCSV(report: DiscoveryReport) {
  const fields = [
    "fixture",
    "publisher",
    "title",
    "tmdbId",
    "season",
    "episode",
    "sourceUrl",
    "durationSeconds",
    "classification",
    "matchingConfidence",
    "subtitleAvailability",
    "regionVerification",
    "embedVerification",
    "approvalStatus",
    "reviewDecision",
    "reason",
    "channelId",
    "browserPlayback",
    "seeking",
    "fullscreen",
    "verifiedAt",
  ];
  const rows = report.candidates.map((row) => [
    row.fixture,
    row.publisherName,
    row.match.title ?? row.videoTitle,
    row.match.tmdbId,
    row.match.season,
    row.match.episode,
    row.sourceUrl,
    row.durationSeconds,
    row.classification,
    row.match.confidence,
    row.subtitleAvailability,
    row.regionVerification,
    row.embedVerification,
    row.approvalStatus,
    row.reviewDecision,
    [row.reviewReason, row.match.reason, ...row.duplicateReasons].join(" "),
    row.channelId,
    row.verification.browserPlayback,
    row.verification.seeking,
    row.verification.fullscreen,
    row.verification.verifiedAt,
  ]);
  return (
    [fields, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
export async function saveReport(directory: string, report: DiscoveryReport) {
  await atomicJSON(join(directory, "discovery.json"), report);
  await writeFile(join(directory, "discovery.csv"), reportCSV(report), {
    mode: 0o600,
  });
}
export interface CandidateStore {
  schemaVersion: 1;
  fixture: boolean;
  candidates: Candidate[];
}
