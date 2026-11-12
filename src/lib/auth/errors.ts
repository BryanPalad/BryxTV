export function authErrorMessage(
  kind: "login" | "register" | "logout",
  status?: number,
) {
  if (status === 429)
    return "Too many attempts. Please wait a minute and try again.";
  if (status === 403) return "Access denied. This private preview requires an invited, verified account. Contact the owner for access.";
  if (kind === "login")
    return status === 401 || status === 403
      ? "Email or password is incorrect."
      : "Unable to sign in right now. Please try again.";
  if (kind === "register")
    return "Unable to complete registration. Please try again, or sign in if you already have an account.";
  return "Unable to log out. Please try again.";
}
