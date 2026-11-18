import Link from "next/link";
import { AuthPage } from "@/features/auth/components/auth-page";
import { FamilySignOut } from "@/features/auth/components/family-sign-out";
export const metadata = { title: "Access denied", robots: { index: false, follow: false } };
export default function AccessDenied() {
  return <AuthPage title="Private family preview" description="Your account does not have access to this preview.">
    <p className="auth-social-note">Contact the owner to confirm your invitation. No account details have been shared.</p>
    <FamilySignOut />
    <Link href="/login" className="text-blue-400 underline">Return to sign in</Link>
  </AuthPage>;
}
