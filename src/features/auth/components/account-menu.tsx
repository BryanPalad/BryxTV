"use client";
import { ProfileAvatar } from "./profile-avatar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { addTransitionType, useState, useTransition } from "react";
import { UserRound, LogOut } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { authClient } from "@/lib/auth/client";
import { safeReturnTo } from "@/lib/auth/redirect";
import { authErrorMessage } from "@/lib/auth/errors";
export function AccountMenu() {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const { data, isPending } = authClient.useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (isPending)
    return (
      <button
        className="account-trigger"
        disabled
        aria-label="Checking account"
      >
        <UserRound size={18} aria-hidden="true" />
      </button>
    );
  if (!data?.user)
    return (
      <Link
        className="header-sign-in"
        href={`/login?returnTo=${encodeURIComponent(safeReturnTo(pathname))}`}
        aria-label="Sign in to BryxTV"
        title="Sign in"
      >
        Sign In
      </Link>
    );
  const name = data.user.name || "Member";
  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(authErrorMessage("logout", result.error.status));
        return;
      }
      setOpen(false);
      startNavigation(() => {
        addTransitionType("auth");
        router.replace("/", { transitionTypes: ["auth"] });
        // Clear cached authenticated pages after the session is revoked.
        router.refresh();
      });
    } catch {
      setError(authErrorMessage("logout"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className="account-trigger"
          aria-label={`Account menu for ${name}`}
          title={name}
        >
          <ProfileAvatar name={name} image={data.user.image ?? null} compact />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="account-dropdown"
          align="end"
          sideOffset={12}
        >
          <DropdownMenu.Label className="account-menu-label">
            {name}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="account-menu-separator" />
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="account-menu-item"
              onClick={() => setOpen(false)}
            >
              <UserRound size={16} aria-hidden="true" />
              Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/my-list" className="account-menu-item" onClick={() => setOpen(false)}>My List</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild><Link href="/history" className="account-menu-item" onClick={() => setOpen(false)}>Viewing History</Link></DropdownMenu.Item>
          <DropdownMenu.Item
            className="account-menu-item"
            disabled={busy || isNavigating}
            onSelect={(event) => {
              event.preventDefault();
              void logout();
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            {busy || isNavigating ? "Logging out…" : "Logout"}
          </DropdownMenu.Item>
          {error && (
            <p className="auth-field-error" role="alert">
              {error}
            </p>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
