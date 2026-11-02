import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { googleOAuthErrorMessage } from "@/lib/auth/google";
import { AuthPage } from "@/features/auth/components/auth-page";
import { LoginForm } from "@/features/auth/components/auth-forms";
import { safeReturnTo } from "@/lib/auth/redirect";
import type { SearchParams } from "@/types/catalog";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      title="Welcome back."
      description="Sign in to your BryxTV account."
    >
      {params.oauth === "error" && (
        <p className="auth-message error" role="alert">{googleOAuthErrorMessage(params.error)}</p>
      )}
      <GoogleSignInButton
        returnTo={safeReturnTo(params.returnTo)}
        enabled={Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())}
      />
      <LoginForm
        returnTo={safeReturnTo(params.returnTo)}
        registered={params.registered === "1"}
      />
    </AuthPage>
  );
}
