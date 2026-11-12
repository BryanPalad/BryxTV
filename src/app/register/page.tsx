import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { googleOAuthErrorMessage } from "@/lib/auth/google";
import { AuthPage } from "@/features/auth/components/auth-page";
import { RegisterForm } from "@/features/auth/components/auth-forms";
import { safeReturnTo } from "@/lib/auth/redirect";
import type { SearchParams } from "@/types/catalog";
import { familyStaging } from "@/lib/auth/family-policy";
export const metadata = {
  title: "Create an account",
  robots: { index: false, follow: true },
};
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      title="Your next chapter starts here."
      description="Create your BryxTV account. Every Story. One Screen."
    >
      {params.oauth === "error" && (
        <p className="auth-message error" role="alert">{googleOAuthErrorMessage(params.error)}</p>
      )}
      <GoogleSignInButton
        showEmailDivider={!familyStaging()}
        returnTo={safeReturnTo(params.returnTo)}
        enabled={Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())}
      />
      {familyStaging() ? <p className="auth-social-note">This private preview is invitation-only. Use your invited Google account. Password self-registration is disabled.</p> : <RegisterForm returnTo={safeReturnTo(params.returnTo)} />}
    </AuthPage>
  );
}
