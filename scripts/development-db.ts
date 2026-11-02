import pg from "pg";
/** Explicit server identity guard shared by development-only write tools. */
export async function verifyDevelopmentDatabase() {
  if (process.env.NODE_ENV === "production") throw new Error("Development tool only.");
  const urls = ["DATABASE_URL", "DIRECT_URL"].map(key => new URL(process.env[key] ?? ""));
  if (urls[0]!.hostname.replace("-pooler.", ".") !== urls[1]!.hostname || urls[0]!.pathname !== urls[1]!.pathname || urls.some(url => !url.hostname.endsWith(".neon.tech") || !["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode") ?? ""))) throw new Error("Unexpected database configuration.");
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const client = new pg.Client({ connectionString: process.env[key], connectionTimeoutMillis: 15000, query_timeout: 15000 });
    try {
      await client.connect(); await client.query("BEGIN READ ONLY");
      const result = await client.query("SELECT current_setting('neon.branch_id',true) AS id");
      if (result.rows[0]?.id !== "br-raspy-sun-az80iq7r") throw new Error("Unexpected branch.");
      await client.query("ROLLBACK");
    } finally { await client.end(); }
  }
}
