import { z } from "zod";

type Environment = Record<string, string | undefined>;
const emailSchema = z.string().trim().toLowerCase().max(254).email();
export function familyStaging(env: Environment = process.env) {
  // A missing marker must not silently disable protection on Vercel Preview.
  return env.BRYXTV_ENV === "staging" || env.VERCEL_ENV === "preview";
}
export function familyAllowlist(env: Environment = process.env): Set<string> | null {
  if (env.BRYXTV_ENV === "staging" && env.VERCEL_ENV === "production")
    throw new Error("Private staging must use a Preview deployment.");
  if (!familyStaging(env)) return null;
  const values = env.STAGING_ALLOWED_EMAILS?.split(",") ?? [];
  if (!values.length || values.length > 100)
    throw new Error("Private staging authorization is not configured.");
  const parsed = values.map(value => emailSchema.safeParse(value));
  if (parsed.some(result => !result.success))
    throw new Error("Private staging authorization is not configured.");
  return new Set(parsed.map(result => result.data!));
}
export function familyEmailAllowed(email: unknown, env: Environment = process.env) {
  const allowed = familyAllowlist(env);
  if (!allowed) return true;
  const parsed = emailSchema.safeParse(email);
  return parsed.success && allowed.has(parsed.data);
}
export function familyUserAllowed(user: { email?: unknown; emailVerified?: boolean }, env: Environment = process.env) {
  return !familyStaging(env) || (familyEmailAllowed(user.email, env) && user.emailVerified === true);
}
export function familySessionAllowed(session: { user: { email?: unknown; emailVerified?: boolean }; session: { expiresAt: Date | string } } | null, env: Environment = process.env) {
  return !!session && new Date(session.session.expiresAt).getTime() > Date.now() && familyUserAllowed(session.user, env);
}
