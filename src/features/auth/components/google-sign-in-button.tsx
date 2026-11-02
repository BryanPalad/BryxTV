"use client";

import { useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { googleSignInOptions, googleLinkOptions, GOOGLE_SIGN_IN_ERROR } from "@/lib/auth/google";

export function GoogleSignInButton({
  returnTo,
  enabled,
  mode = "sign-in",
}: {
  returnTo: string;
  enabled: boolean;
  mode?: "sign-in" | "link";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);

  async function signIn() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(false);
    try {
      const result = mode === "link"
        ? await authClient.linkSocial(googleLinkOptions)
        : await authClient.signIn.social(googleSignInOptions(returnTo));
      if (result.error || !result.data?.url) throw new Error("OAuth unavailable");
      // Better Auth redirects to Google; keep loading until the document leaves.
    } catch {
      inFlight.current = false;
      setBusy(false);
      setError(true);
    }
  }

  return (
    <div className="auth-social">
      <button
        type="button"
        className="auth-google"
        disabled={!enabled || busy}
        aria-busy={busy}
        onClick={() => void signIn()}
      >
        {busy ? (
          <LoaderCircle className="auth-spinner" size={20} aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
            <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" />
            <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z" />
            <path fill="#FBBC05" d="M12.6 27.6a12.2 12.2 0 0 1 0-7.2v-5.2H5.8a20 20 0 0 0 0 17.6l6.8-5.2Z" />
            <path fill="#EA4335" d="M24 12c3 0 5.6 1 7.7 3l5.8-5.7A19.3 19.3 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15.2l6.8 5.2C14.2 15.6 18.7 12 24 12Z" />
          </svg>
        )}
        {busy ? "Connecting to Google…" : mode === "link" ? "Connect Google" : "Continue with Google"}
      </button>
      {!enabled && <p className="auth-social-note">Google sign-in is temporarily unavailable. You can use email below.</p>}
      {error && <p className="auth-field-error" role="alert">{GOOGLE_SIGN_IN_ERROR}</p>}
      {mode === "sign-in" && <div className="auth-divider"><span>or continue with email</span></div>}
    </div>
  );
}
