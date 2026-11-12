export async function register() {
  const { familyAllowlist } = await import("./lib/auth/family-policy");
  familyAllowlist(); // Fail closed before serving a misconfigured staging instance.
}
