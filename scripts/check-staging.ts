import pg from "pg";
import { validateStagingEnvironment } from "./staging-environment";

// Intentionally do not load .env.local: check only explicitly supplied staging values.
async function main() {
  validateStagingEnvironment(process.env);
  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const client = new pg.Client({ connectionString: process.env[key], connectionTimeoutMillis: 15000, query_timeout: 15000 });
    try {
      await client.connect();
      await client.query("BEGIN READ ONLY");
      const result = await client.query("SELECT current_setting('neon.branch_id', true) AS id");
      if (result.rows[0]?.id !== process.env.STAGING_NEON_BRANCH_ID)
        throw new Error("Branch mismatch.");
      await client.query("SELECT 1");
      await client.query("ROLLBACK");
      console.log(`${key}: expected branch and read-only connectivity verified.`);
    } finally { await client.end(); }
  }
  console.log("Staging environment passed. Deployment protection and OAuth still require manual verification.");
}
main().catch(() => {
  console.error("Staging check failed. Check required values, HTTPS origins, TLS, paired Neon URLs, and expected branch. Details withheld to protect credentials.");
  process.exitCode = 1;
});
