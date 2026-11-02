import nextEnv from "@next/env";
import { betterAuth } from "better-auth/minimal";
import { authOptions } from "../src/lib/auth/options";
nextEnv.loadEnvConfig(process.cwd());
// Official offline CLI workflow (--adapter prisma): share policy without loading
// the server-only application client or weakening its import boundary.
export const auth = betterAuth({
  ...authOptions,
  ...(process.env.BETTER_AUTH_SECRET
    ? { secret: process.env.BETTER_AUTH_SECRET }
    : {}),
  ...(process.env.BETTER_AUTH_URL
    ? { baseURL: process.env.BETTER_AUTH_URL }
    : {}),
});
