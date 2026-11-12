export function validateStagingEnvironment(env: Record<string, string | undefined>) {
  const required = ["BETTER_AUTH_SECRET", "DATABASE_URL", "DIRECT_URL", "STAGING_NEON_BRANCH_ID", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "TMDB_READ_ACCESS_TOKEN"];
  if (env.BRYXTV_ENV !== "staging" || required.some(key => !env[key]?.trim()) || env.BETTER_AUTH_SECRET!.length < 32 || !/^br-[a-z0-9-]+$/.test(env.STAGING_NEON_BRANCH_ID!))
    throw new Error("Missing staging configuration.");
  const app = new URL(env.NEXT_PUBLIC_APP_URL ?? "");
  const auth = new URL(env.BETTER_AUTH_URL ?? "");
  for (const url of [app, auth]) {
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" || !url.hostname.includes(".") || /localhost|YOUR-STABLE/i.test(url.hostname))
      throw new Error("Invalid staging origin.");
  }
  if (app.origin !== auth.origin) throw new Error("Origin mismatch.");
  const urls = [env.DATABASE_URL!, env.DIRECT_URL!].map(value => new URL(value));
  if (urls.some(url => !["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname.endsWith(".neon.tech") || !["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) || urls[0]!.hostname.replace("-pooler.", ".") !== urls[1]!.hostname || urls[0]!.pathname !== urls[1]!.pathname || urls[1]!.hostname.includes("-pooler."))
    throw new Error("Invalid paired Neon configuration.");
}
