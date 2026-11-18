import nextEnv from "@next/env";
import { defineConfig } from "prisma/config";

// Match Next.js env-file precedence, including .env.local, without logging values.
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Optional while generating/validating offline; database CLI commands require it.
  // Never fall back to the application's pooled connection for migrations.
  ...(process.env.DIRECT_URL
    ? { datasource: { url: process.env.DIRECT_URL } }
    : {}),
});
