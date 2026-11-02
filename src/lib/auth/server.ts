import "server-only";
import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { getPrisma } from "@/lib/db/prisma";
import { authOptions, googleProviderOptions } from "./options";

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const configuredURL = process.env.BETTER_AUTH_URL;
  if (!secret || secret.length < 32 || !configuredURL)
    throw new Error("Authentication environment is not configured.");
  const url = new URL(configuredURL);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Authentication requires a valid application origin.");
  return betterAuth({
    ...authOptions,
    appName: "BryxTV",
    baseURL: url.origin,
    secret,
    trustedOrigins: [url.origin],
    socialProviders: process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID.trim(),
            clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
            ...googleProviderOptions,
          },
        }
      : {},
    database: prismaAdapter(getPrisma(), { provider: "postgresql" }),
    advanced: {
      cookiePrefix: "bryxtv",
      useSecureCookies: url.protocol === "https:",
    },
  });
}
let auth: ReturnType<typeof createAuth> | undefined;
/** Lazy to keep public browsing/builds independent of auth environment availability. */
export function getAuth() {
  return (auth ??= createAuth());
}
