import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookie } from "better-auth/cookies";
import { getAuth } from "./server";
import { familySessionAllowed } from "./family-policy";

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders, { cookiePrefix: "bryxtv" }))
    return null;
  // Validate against the database; a cookie's existence is never authorization.
  try {
    const session = await getAuth().api.getSession({ headers: requestHeaders });
    return familySessionAllowed(session) ? session : null;
  } catch {
    // Fail closed without passing provider errors or credentials to Next logs.
    throw new Error("Unable to verify your session. Please try again later.");
  }
});
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=%2Fprofile");
  return session;
}
