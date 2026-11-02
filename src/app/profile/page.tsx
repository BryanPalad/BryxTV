import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { googleOAuthErrorMessage } from "@/lib/auth/google";
import type { SearchParams } from "@/types/catalog";
import { ProfileAvatar } from "@/features/auth/components/profile-avatar";
import { getPrisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";
import { AuthPage } from "@/features/auth/components/auth-page";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};
export default async function Profile({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await requireSession();
  const params = await searchParams;
  const accounts = await getPrisma().account.findMany({
    where: { userId: user.id },
    select: { providerId: true },
  });
  const methods = [...new Set(accounts.map(({ providerId }) =>
    providerId === "google" ? "Google" : providerId === "credential" ? "Email and password" : "Other provider",
  ))];
  return (
    <AuthPage title="Your profile" description="Your BryxTV account details.">
      <ProfileAvatar name={user.name} image={user.image ?? null} />
      <dl className="profile-details">
        <div>
          <dt>Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Email status</dt>
          <dd>{user.emailVerified ? "Verified" : "Not verified"}</dd>
        </div>
        <div>
          <dt>Sign-in methods</dt>
          <dd>{methods.join(", ") || "No linked providers"}</dd>
        </div>
        <div>
          <dt>Member since</dt>
          <dd>
            {new Intl.DateTimeFormat("en", {
              dateStyle: "long",
              timeZone: "UTC",
            }).format(new Date(user.createdAt))}
          </dd>
        </div>
      </dl>
      {params.oauth === "error" && (
        <p className="auth-message error auth-connect" role="alert">{googleOAuthErrorMessage(params.error)}</p>
      )}
      {!accounts.some(account => account.providerId === "google") && (
        <section className="auth-connect" aria-label="Connect your Google account">
          <p className="auth-description">Connect a Google account with the same email to sign in either way.</p>
          <GoogleSignInButton
            mode="link"
            returnTo="/profile"
            enabled={Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())}
          />
        </section>
      )}
    </AuthPage>
  );
}
