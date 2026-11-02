import { test } from "node:test";
import assert from "node:assert/strict";
import { betterAuth } from "better-auth/minimal";
import { memoryAdapter } from "better-auth/adapters/memory";
import { authOptions, googleProviderOptions } from "../src/lib/auth/options";
import { googleSignInOptions, googleAvatarURL } from "../src/lib/auth/google";

const avatarToken = `test.${Buffer.from(JSON.stringify({
  sub: "test-google-subject", picture: "https://lh3.googleusercontent.com/a/test",
})).toString("base64url")}.test`;

const origin = "http://localhost:3101";
function testAuth(profile?: { email: string; verified: boolean }) {
  return betterAuth({
    ...authOptions,
    plugins: [],
    rateLimit: { enabled: false },
    baseURL: origin,
    trustedOrigins: [origin],
    secret: "test-only-oauth-secret-not-used-outside-tests-0123456789",
    database: memoryAdapter({ user: [], account: [], session: [], verification: [] }),
    socialProviders: { google: {
      ...googleProviderOptions,
      clientId: "test-client.apps.googleusercontent.com",
      clientSecret: "test-only-google-secret",
      // Test-only provider boundary: no network, real tokens, or Neon writes.
      ...(profile ? {
        verifyIdToken: async () => true,
        getUserInfo: async () => ({
          user: { name: "Google Member", email: profile.email,
            emailVerified: profile.verified, image: "https://lh3.googleusercontent.com/a/test" },
          data: { sub: "test-google-subject", family_name: "Member", given_name: "Google", name: "Google Member", email: profile.email,
            email_verified: profile.verified, picture: "https://lh3.googleusercontent.com/a/test",
            iss: "https://accounts.google.com", aud: "test-client.apps.googleusercontent.com",
            iat: 1, exp: 2, azp: "test-client.apps.googleusercontent.com" },
        }),
      } : {}),
    } },
  });
}

test("Google callbacks sanitize destinations and avatars reject unsafe or unrelated hosts", () => {
  assert.equal(googleSignInOptions("/movies").callbackURL, "/movies");
  for (const path of ["https://evil.test", "//evil.test", "/api/auth/sign-out", "/login", undefined])
    assert.equal(googleSignInOptions(path).callbackURL, "/profile");
  assert.equal(googleAvatarURL("https://lh3.googleusercontent.com/a/example"), "https://lh3.googleusercontent.com/a/example");
  for (const url of [null, "javascript:alert(1)", "http://lh3.googleusercontent.com/a", "https://evil.test/a", "https://lh3.googleusercontent.com.evil.test/a", "https://user:secret@lh3.googleusercontent.com/a"])
    assert.equal(googleAvatarURL(url), null);
  assert.deepEqual(authOptions.account.accountLinking.trustedProviders, []);
  assert.equal(authOptions.account.accountLinking.allowDifferentEmails, false);
  assert.equal(authOptions.account.encryptOAuthTokens, true);
  assert.deepEqual(authOptions.user.validateUserInfo({
    user: { emailVerified: false }, source: { method: "oauth", action: "sign-in", oauth: { providerId: "google" } },
  }), { error: "email_not_verified" });
});

test("OAuth initiation uses the standard callback, state, PKCE, and only basic Google scopes", async () => {
  const auth = testAuth();
  const response = await auth.handler(new Request(`${origin}/api/auth/sign-in/social`, {
    method: "POST", headers: { "content-type": "application/json", origin },
    body: JSON.stringify(googleSignInOptions("/profile")),
  }));
  assert.equal(response.status, 200);
  const { url, redirect } = await response.json();
  const target = new URL(url);
  assert.equal(target.origin, "https://accounts.google.com");
  assert.equal(target.searchParams.get("redirect_uri"), `${origin}/api/auth/callback/google`);
  assert.deepEqual(target.searchParams.get("scope")!.split(" ").sort(), ["email", "openid", "profile"]);
  assert.ok(target.searchParams.get("state"));
  assert.ok(target.searchParams.get("code_challenge"));
  assert.equal(target.searchParams.get("code_challenge_method"), "S256");
  assert.equal(target.searchParams.get("access_type"), "online");
  assert.notEqual(target.searchParams.get("include_granted_scopes"), "true");
  assert.equal(redirect, true);
  assert.equal(target.searchParams.has("client_secret"), false);
});

test("OAuth initiation rejects untrusted origins and external success/error redirects", async () => {
  const auth = testAuth();
  for (const [requestOrigin, options] of [
    ["https://evil.test", googleSignInOptions("/profile")],
    [origin, { ...googleSignInOptions("/profile"), callbackURL: "https://evil.test" }],
    [origin, { ...googleSignInOptions("/profile"), errorCallbackURL: "https://evil.test" }],
  ] as const) {
    const response = await auth.handler(new Request(`${origin}/api/auth/sign-in/social`, {
      method: "POST", headers: { "content-type": "application/json", origin: requestOrigin, cookie: "bryxtv.session_token=invalid" },
      body: JSON.stringify(options),
    }));
    assert.equal(response.status, 403);
  }
});

async function simulatedGoogleSignIn(auth: ReturnType<typeof testAuth>) {
  return auth.handler(new Request(`${origin}/api/auth/sign-in/social`, {
    method: "POST", headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ ...googleSignInOptions("/profile"), idToken: { token: avatarToken } }),
  }));
}

test("verified Google users are created once and returning Google users retain their existing identity", async () => {
  const auth = testAuth({ email: "google-new@example.invalid", verified: true });
  const first = await simulatedGoogleSignIn(auth);
  assert.equal(first.status, 200);
  const created = (await first.json()).user;
  assert.equal(created.emailVerified, true);
  assert.equal(created.image, "https://lh3.googleusercontent.com/a/test");
  const returning = await simulatedGoogleSignIn(auth);
  assert.equal(returning.status, 200);
  assert.equal((await returning.json()).user.id, created.id);
});

test("Google sign-in never implicitly links an unverified provider or unverified local email", async () => {
  for (const [localVerified, googleVerified] of [[false, true], [true, false], [true, true]]) {
    const auth = testAuth({ email: "existing@example.invalid", verified: googleVerified! });
    const local = await auth.api.signUpEmail({ body: {
      name: "Local Member", email: "existing@example.invalid", password: "test-only-long-password-123",
    } });
    if (localVerified) await (await auth.$context).internalAdapter.updateUser(local.user.id, { emailVerified: true });
    const response = await simulatedGoogleSignIn(auth);
    if (localVerified && googleVerified) {
      assert.equal(response.status, 200);
      assert.equal((await response.json()).user.id, local.user.id);
    } else {
      assert.equal(response.status, 401);
      const stored = await (await auth.$context).internalAdapter.findUserByEmail("existing@example.invalid", { includeAccounts: true });
      assert.equal(stored?.accounts.some(account => account.providerId === "google"), false);
    }
    // Adding or rejecting Google must preserve the existing credential login.
    const passwordLogin = await auth.api.signInEmail({ body: {
      email: "existing@example.invalid", password: "test-only-long-password-123",
    } });
    assert.equal(passwordLogin.user.id, local.user.id);
  }
});

test("an unverified new Google identity cannot receive a session", async () => {
  const auth = testAuth({ email: "unverified@example.invalid", verified: false });
  const response = await simulatedGoogleSignIn(auth);
  assert.equal(response.status, 403);
  assert.equal(response.headers.getSetCookie().some(value => value.includes("session_token=")), false);
});

test("explicit Google linking requires a session and preserves verification and same-email rules", async () => {
  const { googleLinkOptions, googleOAuthErrorMessage, GOOGLE_SIGN_IN_ERROR } = await import("../src/lib/auth/google");
  assert.match(googleOAuthErrorMessage("account_not_linked"), /password.*Your profile.*Connect Google/);
  assert.equal(googleOAuthErrorMessage("<script>private-error</script>"), GOOGLE_SIGN_IN_ERROR);
  for (const [email, verified, expected] of [
    ["owner@example.invalid", true, 200],
    ["owner@example.invalid", false, 401],
    ["other@example.invalid", true, 401],
  ] as const) {
    const profile = { email, verified: Boolean(verified) };
    const auth = testAuth(profile);
    const body = { ...googleLinkOptions, idToken: { token: avatarToken } };
    function link(cookie = "") {
      return auth.handler(new Request(`${origin}/api/auth/link-social`, {
        method: "POST", headers: { "content-type": "application/json", origin, cookie },
        body: JSON.stringify(body),
      }));
    }
    assert.equal((await link()).status, 401);
    await auth.api.signUpEmail({ body: {
      name: "Account Owner", email: "owner@example.invalid", password: "test-only-password-for-linking",
    } });
    const login = await auth.api.signInEmail({ body: {
      email: "owner@example.invalid", password: "test-only-password-for-linking",
    }, asResponse: true });
    const cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const response = await link(cookie);
    assert.equal(response.status, expected);
    const stored = await (await auth.$context).internalAdapter.findUserByEmail("owner@example.invalid", { includeAccounts: true });
    assert.equal(stored?.accounts.some(account => account.providerId === "google"), expected === 200);
    if (expected === 200) {
      assert.equal(stored?.user.image, "https://lh3.googleusercontent.com/a/test");
      assert.equal(stored?.user.name, "Account Owner");
      const googleLogin = await simulatedGoogleSignIn(auth);
      assert.equal(googleLogin.status, 200);
      assert.equal((await googleLogin.json()).user.id, stored?.user.id);
      profile.verified = false;
      assert.equal((await simulatedGoogleSignIn(auth)).status, 403);
    }
  }
});

test("stored Google avatars are display-only, constrained to Google hosts and their account subject", async () => {
  const { storedGoogleAvatar } = await import("../src/lib/auth/google-avatar");
  const account = { providerId: "google", accountId: "test-google-subject", idToken: avatarToken };
  assert.equal(storedGoogleAvatar(account), "https://lh3.googleusercontent.com/a/test");
  assert.equal(storedGoogleAvatar({ ...account, providerId: "credential" }), null);
  assert.equal(storedGoogleAvatar({ ...account, accountId: "another-user" }), null);
  assert.equal(storedGoogleAvatar({ ...account, idToken: "invalid" }), null);
  const token = `test.${Buffer.from(JSON.stringify({ sub: account.accountId, picture: "https://evil.test/avatar" })).toString("base64url")}.test`;
  assert.equal(storedGoogleAvatar({ ...account, idToken: token }), null);
});
