/** Public OAuth routing policy only. Provider credentials stay in server.ts. */
import { safeReturnTo } from "./redirect";

export const GOOGLE_SIGN_IN_ERROR =
  "Unable to continue with Google. Please try again.";

/** Only recognized codes select fixed copy; never display provider descriptions. */
export function googleOAuthErrorMessage(code: unknown): string {
  if (code === "family_access_denied") return "Access denied. This private preview is available only to invited family members.";
  if (code === "account_not_linked")
    return "This email already has a BryxTV account. Sign in with your password, open Your profile, then choose Connect Google.";
  if (code === "email_does_not_match")
    return "Choose the Google account with the same email address as your BryxTV account.";
  if (code === "account_already_linked_to_different_user")
    return "This Google account is already connected to another BryxTV account. Please use its original sign-in method.";
  if (code === "access_denied")
    return "Google sign-in was cancelled. You can try again or continue with email.";
  return GOOGLE_SIGN_IN_ERROR;
}

export const googleLinkOptions = {
  provider: "google" as const,
  callbackURL: "/profile",
  errorCallbackURL: "/profile?oauth=error",
};

export function googleSignInOptions(returnTo: unknown) {
  const destination = safeReturnTo(returnTo);
  return {
    provider: "google" as const,
    callbackURL: destination,
    newUserCallbackURL: destination,
    errorCallbackURL: `/login?oauth=error&returnTo=${encodeURIComponent(destination)}`,
  };
}

/** Accept Google-hosted HTTPS avatars only; never arbitrary provider image URLs. */
export function googleAvatarURL(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname.endsWith(".googleusercontent.com") &&
      !url.username && !url.password && !url.port
      ? url.href
      : null;
  } catch {
    return null;
  }
}
