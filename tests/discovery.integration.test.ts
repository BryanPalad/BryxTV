import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, rm } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { resolve } from "node:path";
import { readJSON } from "../src/features/playback/discovery/storage";
const exec = promisify(execFile);
const env: NodeJS.ProcessEnv = {
  ...process.env,
  YOUTUBE_API_KEY: "",
  NODE_ENV: "test",
};
const run = (args: string[], overrides: Partial<NodeJS.ProcessEnv> = {}) =>
  exec(
    process.execPath,
    ["--conditions=react-server", "--import", "tsx", ...args],
    { cwd: process.cwd(), env: { ...env, ...overrides }, timeout: 30000 },
  );
test("fixture CLI integration writes labeled JSON/CSV, honors limits and dry-run, and cannot mutate public approvals", async () => {
  const stateBase = resolve(".bryxtv/discovery", `integration-${randomUUID()}`);
  const output = resolve("reports/discovery", `integration-${randomUUID()}`),
    manifest = resolve("src/features/playback/data/official-sources.json"),
    state = resolve(stateBase, "fixtures/candidates.json");
  const before = createHash("sha256")
      .update(await readFile(manifest))
      .digest("hex"),
    staged = await readJSON(state, null);
  try {
    await run([
      "scripts/content-discover.ts",
      "--state-dir",
      stateBase,
      "--fixture",
      "--type",
      "all",
      "--limit",
      "6",
      "--dry-run",
      "--out",
      output,
    ]);
    const report = JSON.parse(
      await readFile(resolve(output, "discovery.json"), "utf8"),
    );
    assert.equal(report.fixture, true);
    assert.equal(report.dryRun, true);
    assert.ok(report.examined <= 6);
    assert.equal(report.counts.approvedEpisodes, 0);
    assert.equal(report.counts.verifiedPlayableEpisodes, 0);
    assert.ok(
      report.candidates.every(
        (r: { enabled: boolean; approvalStatus: string }) =>
          r.enabled === false && r.approvalStatus === "UNKNOWN",
      ),
    );
    assert.ok(
      (await readFile(resolve(output, "discovery.csv"), "utf8")).includes(
        '"fixture"',
      ),
    );
    assert.deepEqual(await readJSON(state, null), staged);
    assert.equal(
      createHash("sha256")
        .update(await readFile(manifest))
        .digest("hex"),
      before,
    );
    await assert.rejects(
      () => run(["scripts/content-discover.ts", "--type", "anime"]),
      (error) =>
        error instanceof Error &&
        error.message.includes("YouTube discovery is inactive"),
    );
    await assert.rejects(() =>
      run(["scripts/content-discover.ts", "--fixture"], {
        NODE_ENV: "production",
      }),
    );
    const stageArgs = [
      "scripts/content-discover.ts",
      "--fixture",
      "--state-dir",
      stateBase,
      "--limit",
      "6",
      "--out",
      output,
    ];
    await run(stageArgs);
    const once = await readJSON<{
      candidates: { videoId: string; enabled: boolean }[];
    }>(state, { candidates: [] });
    await run(stageArgs);
    const twice = await readJSON<{
      candidates: { videoId: string; enabled: boolean }[];
    }>(state, { candidates: [] });
    assert.equal(twice.candidates.length, once.candidates.length);
    assert.equal(
      new Set(twice.candidates.map((r) => r.videoId)).size,
      twice.candidates.length,
    );
    assert.ok(twice.candidates.every((r) => r.enabled === false));
    await assert.rejects(() =>
      run([
        "scripts/content-review.ts",
        "--state-dir",
        stateBase,
        "--fixture",
        "--video",
        "fxVideo0001",
        "--prepare-approval",
        "--export-review",
        resolve(output, "forbidden.json"),
      ]),
    );
    await assert.rejects(() =>
      run(["scripts/content-review.ts", "--approve-all"]),
    );
  } finally {
    await rm(output, { recursive: true, force: true });
    await rm(stateBase, { recursive: true, force: true });
  }
});
