import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  bryxtvPrisma?: PrismaClient;
};
let client: PrismaClient | undefined;

/** Lazy initialization keeps builds offline and development hot reload pool-safe. */
export function getPrisma(): PrismaClient {
  const existing = globalForPrisma.bryxtvPrisma ?? client;
  if (existing) return existing;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) {
    throw new Error("DATABASE_URL must be configured for server database queries.");
  }

  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  client = new PrismaClient({ adapter, log: [] });
  if (process.env.NODE_ENV !== "production") globalForPrisma.bryxtvPrisma = client;
  return client;
}
