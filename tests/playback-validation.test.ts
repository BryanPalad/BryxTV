import { test } from "node:test";
import assert from "node:assert/strict";
import { validationAllowed, validationMovieURL, validationPath, validValidationMovieURL } from "../src/features/playback/development/validation-policy";
import { validationSource } from "../src/features/playback/development/validation-source";
import config from "../next.config";

test("complete-film fixture is limited to local development and cannot register catalog content", () => {
  const env = { NODE_ENV: "development" };
  for (const host of ["localhost:3000", "127.0.0.1:3001", "[::1]:3000"]) assert.equal(validationAllowed(env, host), true);
  for (const host of ["localhost.evil.test", "staging.example", "", "localhost@evil.test"]) assert.equal(validationSource(env, host), null);
  for (const patch of [{ NODE_ENV: "production" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: "production" }])
    assert.equal(validationSource({ ...env, ...patch }, "localhost:3000"), null);
  const source = validationSource(env, "localhost:3000")!;
  assert.equal(source.sourceUrl, validationMovieURL);
  assert.equal(source.mediaId, "demo:bbb-complete-development");
  assert.equal(source.crossOrigin, null);
  assert.match(source.attribution.changes, /complete ending credits/);
  for (const url of [validationMovieURL + "?redirect=evil", validationMovieURL.replace("video.blender.org", "evil.test"), "//video.blender.org/file.mp4", "javascript:alert(1)"])
    assert.equal(validValidationMovieURL(url), false);
});

test("remote media CSP exception exists only on the local development validation path", async () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, VERCEL_ENV: process.env.VERCEL_ENV };
  try {
    for (const [runtime, vercel, allowed] of [["development", "", true], ["production", "", false], ["development", "preview", false], ["development", "production", false]] as const) {
      Object.assign(process.env, { NODE_ENV: runtime, VERCEL_ENV: vercel });
      const rules = await config.headers!();
      const fixture = rules.find(rule => rule.source === validationPath);
      assert.equal(!!fixture, allowed);
      assert.equal(rules[0]!.headers.some(header => header.value.includes(validationMovieURL)), false);
      if (fixture) {
        assert.match(fixture.headers[0]!.value, /frame-ancestors 'none'/);
        assert.ok(fixture.headers[0]!.value.includes(validationMovieURL));
        assert.doesNotMatch(fixture.headers[0]!.value, /media-src[^;]*\*/);
      }
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
