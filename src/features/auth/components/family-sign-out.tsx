"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
export function FamilySignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <>
    <Button className="auth-submit" disabled={busy} onClick={async () => {
      setBusy(true); setError(false);
      try {
        const result = await authClient.signOut();
        if (result.error) throw new Error();
        router.replace("/login");
        router.refresh();
      } catch { setError(true); setBusy(false); }
    }}>{busy ? "Signing out…" : "Sign out and switch account"}</Button>
    {error && <p role="alert" className="auth-field-error">Unable to sign out. Please try again.</p>}
  </>;
}
