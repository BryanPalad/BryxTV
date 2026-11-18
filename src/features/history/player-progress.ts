import { resumePosition, type ProgressIdentity, type ProgressSample } from "./types";
import { parseProgress, type PlaybackProgress } from "@/lib/playback/progress";
import type { PlaybackSource } from "@/types/playback";
export const SAVE_INTERVAL = 12000;
interface Media { currentTime: number; duration: number; paused: boolean; pause: () => void }
type Saved = { positionSeconds: number; durationSeconds: number; completed: boolean } | null;
/** One writer at a time; retain only the latest sample while a request is in flight. */
export class ProgressWriter {
  private pending: ProgressSample | null = null;
  private running: Promise<void> | null = null;
  private lastQueued = 0;
  private draining = false;
  constructor(private send: (sample: ProgressSample) => Promise<void>, private failed: () => void) {}
  enqueue(sample: ProgressSample) {
    if (sample.observedAt <= this.lastQueued) return;
    this.lastQueued = sample.observedAt;
    this.pending = sample;
    if (!this.draining) { this.draining = true; this.running = this.drain(); }
  }
  private async drain() {
    while (this.pending) {
      const sample = this.pending; this.pending = null;
      try { await this.send(sample); } catch { this.failed(); }
    }
    this.draining = false;
  }
  async idle() { await this.running; }
}
interface Options {
  source: PlaybackSource;
  target: ProgressIdentity;
  authenticated: boolean;
  restart: boolean;
  read: () => Promise<Saved>;
  writer: ProgressWriter;
  localRead: () => string | null;
  localWrite: (sample: PlaybackProgress) => void;
  notice: (text: string) => void;
  now?: () => number;
}
export class PlayerProgress {
  ready = false;
  private active = true;
  private played = false;
  private allowWrite = true;
  private lastSave = 0;
  private observedAt = 0;
  private latest: ProgressSample | null = null;
  constructor(private options: Options) {}
  async restore(media: Media) {
    const opts = this.options;
    if (!Number.isFinite(media.duration) || media.duration <= 0) return;
    let position = 0;
    try {
      if (opts.authenticated) position = resumePosition(await opts.read(), media.duration);
      else {
        const saved = parseProgress(opts.localRead(), opts.source, opts.source.id);
        position = saved ? resumePosition({ positionSeconds: saved.position, durationSeconds: saved.duration, completed: saved.completed }, media.duration) : 0;
      }
      if (!this.active) return;
      media.currentTime = opts.restart ? 0 : position;
      this.ready = true;
      opts.notice(position && !opts.restart ? `Resumed at ${Math.floor(position / 60)}:${String(Math.floor(position % 60)).padStart(2, "0")}.` : opts.authenticated ? "Progress syncs with your BryxTV account." : "Progress is saved on this device.");
      if (opts.restart) this.restart(media);
    } catch {
      if (!this.active) return;
      this.allowWrite = !opts.authenticated;
      this.ready = true;
      opts.notice(opts.authenticated ? "Saved progress could not load. Playback is available; reload to retry account sync." : "Local progress storage is unavailable. Playback still works.");
    }
  }
  play(media: Media) {
    if (!this.ready) { media.pause(); return; }
    this.played = true;
    this.lastSave = this.now();
  }
  private now() { return this.options.now?.() ?? Date.now(); }
  sample(media: Media, force = false, ended = false) {
    if (!this.active || !this.ready || !this.played || !this.allowWrite || !Number.isFinite(media.currentTime) || !Number.isFinite(media.duration) || media.duration <= 0 || !force && media.paused) return;
    const now = this.now();
    this.observedAt = Math.max(now, this.observedAt + 1);
    this.latest = { ...this.options.target, positionSeconds: ended ? media.duration : Math.max(0, Math.min(media.duration, media.currentTime)), durationSeconds: media.duration, ended, observedAt: this.observedAt };
    if (!force && now - this.lastSave < (this.options.authenticated ? SAVE_INTERVAL : 5000)) return;
    this.lastSave = now;
    this.flush();
  }
  restart(media: Media) {
    if (!this.ready) return;
    media.currentTime = 0;
    this.played = true;
    this.sample(media, true);
    this.options.notice("Restarted from the beginning.");
  }
  flush() {
    const latest = this.latest;
    if (!latest || !this.allowWrite) return;
    if (this.options.authenticated) this.options.writer.enqueue(latest);
    else {
      try {
        this.options.localWrite({ version: 1, sourceId: this.options.source.id, mediaId: this.options.source.mediaId, season: this.options.source.season, episode: this.options.source.episode, position: latest.positionSeconds, duration: latest.durationSeconds, lastWatched: latest.observedAt, completed: latest.ended === true || latest.positionSeconds / latest.durationSeconds >= .95 });
      } catch { /* Guest local storage remains optional. */ }
    }
  }
  stop() { this.flush(); this.active = false; }
}
