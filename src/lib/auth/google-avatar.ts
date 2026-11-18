import "server-only";
import type { Account } from "better-auth";
import type { GenericEndpointContext } from "@better-auth/core";
import { googleAvatarURL } from "./google";

/**
 * Display data from an ID token already verified and stored by Better Auth.
 * This does not authenticate users or replace OAuth signature verification.
 */
export function storedGoogleAvatar(account: Pick<Account, "providerId" | "accountId" | "idToken">) {
  if (account.providerId !== "google" || !account.idToken) return null;
  try {
    const parts = account.idToken.split(".");
    if (parts.length !== 3 || !parts[1]) return null;
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (claims.sub !== account.accountId) return null;
    return typeof claims.picture === "string" ? googleAvatarURL(claims.picture) : null;
  } catch {
    return null;
  }
}

/** Sync only the avatar after Better Auth has accepted a Google account. */
export async function syncGoogleAvatar(account: Account, context: GenericEndpointContext | null) {
  const image = storedGoogleAvatar(account);
  if (!image || !context) return;
  await context.context.internalAdapter.updateUser(account.userId, { image });
}
