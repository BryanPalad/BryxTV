import { test } from "node:test";
import assert from "node:assert/strict";
import { betterAuth } from "better-auth/minimal";
import { memoryAdapter } from "better-auth/adapters/memory";
import { hashPassword } from "better-auth/crypto";
import { authOptions } from "../src/lib/auth/options";
import { familyAllowlist, familyEmailAllowed, familySessionAllowed, familyUserAllowed } from "../src/lib/auth/family-policy";

const env = { BRYXTV_ENV: "staging", STAGING_ALLOWED_EMAILS: " Family@Example.com ,second@example.com" };
test("family configuration normalizes exact identities and fails closed", () => {
  assert.equal(familyEmailAllowed(" FAMILY@example.com ", env), true);
  assert.equal(familyEmailAllowed("family+other@example.com", env), false);
  assert.equal(familyEmailAllowed("stranger@example.com", env), false);
  for (const value of [undefined, "", "bad", "a@example.com,"]) assert.throws(() => familyAllowlist({ ...env, STAGING_ALLOWED_EMAILS: value }));
  assert.throws(() => familyAllowlist({ VERCEL_ENV: "preview" }));
  assert.throws(() => familyAllowlist({ ...env, VERCEL_ENV: "production" }));
  assert.equal(familyAllowlist({ NODE_ENV: "development" }), null);
});
test("family sessions require verified identity, current membership and unexpired session", () => {
  const session = { user: { email: "family@example.com", emailVerified: true }, session: { expiresAt: new Date(Date.now() + 60000) } };
  assert.equal(familySessionAllowed(session, env), true);
  assert.equal(familySessionAllowed(session, { ...env, STAGING_ALLOWED_EMAILS: "second@example.com" }), false);
  assert.equal(familyUserAllowed({ ...session.user, emailVerified: false }, env), false);
  assert.equal(familySessionAllowed({ ...session, session: { expiresAt: new Date(0) } }, env), false);
  assert.equal(familySessionAllowed(null, env), false);
});
test("Better Auth enforces family login, registration, OAuth claims and revoked sessions through direct endpoints", async () => {
  const oldMarker = process.env.BRYXTV_ENV, oldEmails = process.env.STAGING_ALLOWED_EMAILS;
  process.env.BRYXTV_ENV = "staging";
  process.env.STAGING_ALLOWED_EMAILS = "family@example.com,unverified@example.com";
  try {
    const now = new Date();
    const password = "fixture password with enough length";
    const hash = await hashPassword(password);
    const users = ["family", "stranger", "unverified"].map(id => ({ id, name: id, email: `${id}@example.com`, emailVerified: id !== "unverified", createdAt: now, updatedAt: now }));
    const db = { user: users, account: users.map(user => ({ id: `account-${user.id}`, userId: user.id, providerId: "credential", accountId: user.id, password: hash, createdAt: now, updatedAt: now })), session: [] as Record<string, unknown>[], verification: [] };
    const auth = betterAuth({ ...authOptions, plugins: [], secret: "test-only-secret-with-more-than-32-characters", baseURL: "http://localhost:3999", database: memoryAdapter(db), emailAndPassword: { ...authOptions.emailAndPassword, requireEmailVerification: true } });
    const call = (path: string, body?: object, cookie?: string) => auth.handler(new Request(`http://localhost:3999/api/auth/${path}`, { method: body ? "POST" : "GET", headers: { origin: "http://localhost:3999", "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    for (const email of ["family@example.com", "stranger@example.com"]) {
      assert.equal((await call("sign-up/email", { name: "Family Test", email, password })).status, 403);
    }
    assert.equal(db.user.length, 3);
    assert.equal((await call("sign-in/email", { email: "stranger@example.com", password })).status, 403);
    assert.equal((await call("sign-in/email", { email: "unverified@example.com", password })).status, 403);
    const login = await call("sign-in/email", { email: "family@example.com", password });
    assert.equal(login.status, 200);
    const cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    assert.ok(cookie);
    assert.equal((await call("get-session", undefined, cookie)).status, 200);
    // Exercise the exact installed provider hook with fresh verified/unverified claims.
    const source = { method: "oauth" as const, action: "sign-in" as const, oauth: { providerId: "google" } };
    const check = (email: string, emailVerified: boolean) => authOptions.user.validateUserInfo({ user: { ...users[0]!, email, emailVerified }, source });
    assert.equal(check("family@example.com", true), undefined);
    assert.equal(check("stranger@example.com", true)?.error, "family_access_denied");
    assert.equal(check("family@example.com", false)?.error, "family_access_denied");
    const expiresAt = db.session[0]!.expiresAt;
    db.session[0]!.expiresAt = new Date(0);
    assert.equal(await (await call("get-session", undefined, cookie)).json(), null);
    // Expired sessions are removed by Better Auth; sign in again for revocation.
    db.session.length = 0;
    const renewed = await call("sign-in/email", { email: "family@example.com", password });
    assert.equal(renewed.status, 200);
    assert.ok(expiresAt);
    const renewedCookie = renewed.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    process.env.STAGING_ALLOWED_EMAILS = "second@example.com";
    assert.equal((await call("get-session", undefined, renewedCookie)).status, 403);
    assert.equal((await call("list-sessions", undefined, renewedCookie)).status, 403);
    assert.equal((await call("sign-out", {}, renewedCookie)).status, 200);
    assert.equal(db.session.length, 0);
  } finally {
    if (oldMarker === undefined) delete process.env.BRYXTV_ENV; else process.env.BRYXTV_ENV = oldMarker;
    if (oldEmails === undefined) delete process.env.STAGING_ALLOWED_EMAILS; else process.env.STAGING_ALLOWED_EMAILS = oldEmails;
  }
});
