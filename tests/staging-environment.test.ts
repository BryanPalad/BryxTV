import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStagingEnvironment } from "../scripts/staging-environment";
const valid = {
  BRYXTV_ENV: "staging", NEXT_PUBLIC_APP_URL: "https://staging.example.com", BETTER_AUTH_URL: "https://staging.example.com",
  BETTER_AUTH_SECRET: "x".repeat(32), DATABASE_URL: "postgresql://test:test@ep-test-pooler.neon.tech/db?sslmode=verify-full",
  DIRECT_URL: "postgresql://test:test@ep-test.neon.tech/db?sslmode=verify-full", STAGING_NEON_BRANCH_ID: "br-test-only",
  GOOGLE_CLIENT_ID: "fixture", GOOGLE_CLIENT_SECRET: "fixture", TMDB_READ_ACCESS_TOKEN: "fixture",
};
test("staging accepts matching HTTPS origins and paired TLS Neon URLs", () => assert.doesNotThrow(() => validateStagingEnvironment(valid)));
test("staging rejects absent settings, unsafe origins and mismatched databases", () => {
  for (const change of [
    { BRYXTV_ENV: "production" }, { BETTER_AUTH_SECRET: "short" }, { STAGING_NEON_BRANCH_ID: "" },
    { BETTER_AUTH_URL: "http://staging.example.com" }, { BETTER_AUTH_URL: "https://other.example.com" },
    { BETTER_AUTH_URL: "https://staging.example.com/path" }, { GOOGLE_CLIENT_SECRET: "" },
    { DIRECT_URL: "postgresql://test:test@ep-other.neon.tech/db?sslmode=require" },
    { DIRECT_URL: "postgresql://test:test@ep-test.neon.tech/other?sslmode=require" },
    { DIRECT_URL: "postgresql://test:test@ep-test.neon.tech/db" },
  ]) assert.throws(() => validateStagingEnvironment({ ...valid, ...change }));
});
