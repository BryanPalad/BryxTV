import nextEnv from "@next/env";
import pg from "pg";
import prismaConfig from "../prisma.config";

nextEnv.loadEnvConfig(process.cwd());

async function checkConnection(name: "DATABASE_URL" | "DIRECT_URL") {
  const connectionString = process.env[name];
  if (!connectionString?.trim()) throw new Error(`${name} is not configured.`);
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${name} must use a PostgreSQL connection URL.`);
  }
  if (!url.hostname.endsWith(".neon.tech")) {
    throw new Error(`${name} must point to the configured Neon database.`);
  }
  if (!["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) {
    throw new Error(`${name} must require TLS.`);
  }
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
  });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const result = await client.query<{ ok: number }>("SELECT 1 AS ok");
    if (result.rows[0]?.ok !== 1) throw new Error("Unexpected connectivity result.");
    await client.query("ROLLBACK");
    console.log(`${name}: Neon connectivity verified (read-only SELECT 1).`);
  } finally {
    await client.end();
  }
}

async function main() {
  if (!process.env.DIRECT_URL || prismaConfig.datasource?.url !== process.env.DIRECT_URL) {
    throw new Error("Prisma CLI must load DIRECT_URL from the server environment.");
  }
  console.log("Prisma CLI configuration: DIRECT_URL selected; credentials withheld.");
  await checkConnection("DATABASE_URL");
  await checkConnection("DIRECT_URL");
}

main().catch(() => {
  // Driver errors can include hostnames, usernames, or connection details.
  console.error("Database check failed. Verify the server environment, TLS, and Neon network access. No credentials were logged.");
  process.exitCode = 1;
});
