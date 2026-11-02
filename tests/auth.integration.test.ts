import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";

const origin = process.env.BRYX_AUTH_TEST_ORIGIN;
test(
  "live authentication: disposable account, sessions, profile protection, and logout",
  { skip: !origin, timeout: 120_000 },
  async (t) => {
    const base = new URL(origin!);
    assert.ok(
      ["localhost", "127.0.0.1"].includes(base.hostname),
      "Live auth tests must target a local test server.",
    );
    nextEnv.loadEnvConfig(process.cwd());
    const { getPrisma } = await import("../src/lib/db/prisma");
    const db = getPrisma();
    const email = `bryxtv-auth-test-${randomBytes(12).toString("hex")}@example.invalid`;
    const password = randomBytes(24).toString("base64url");
    let ownedId: string | undefined;
    let cookie = "";
    async function post(
      path: string,
      body: object,
      requestCookie = "",
      requestOrigin = base.origin,
    ) {
      return fetch(new URL(`/api/auth/${path}`, base), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: requestOrigin,
          ...(requestCookie ? { Cookie: requestCookie } : {}),
        },
        body: JSON.stringify(body),
        redirect: "manual",
      });
    }
    async function expectLoginRedirect(response: Response) {
      if (response.status === 307) {
        assert.equal(
          response.headers.get("location"),
          "/login?returnTo=%2Fprofile",
        );
        return;
      }
      // Next's root loading boundary may flush before redirect(): streamed
      // redirects use a meta refresh with status 200, never profile content.
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(
        html.includes('http-equiv="refresh"') &&
          html.includes("url=/login?returnTo=%2Fprofile"),
        "Expected a Next.js streamed login redirect.",
      );
      assert.equal(html.includes('class="profile-details"'), false);
    }
    try {
      await t.test(
        "guests cannot access profile and forged cookies do not authorize access",
        async () => {
          for (const path of ["/register", "/login"]) {
            const page = await fetch(new URL(path, base));
            const html = await page.text();
            assert.ok(
              html.includes('method="post"'),
              "Credential forms must never fall back to GET.",
            );
            assert.ok(
              /<fieldset[^>]*disabled/.test(html),
              "Credential fields must wait for client hydration.",
            );
          }
          const guest = await fetch(new URL("/profile", base), {
            redirect: "manual",
          });
          await expectLoginRedirect(guest);
          const forged = await fetch(new URL("/profile", base), {
            headers: { Cookie: "bryxtv.session_token=forged" },
            redirect: "manual",
          });
          await expectLoginRedirect(forged);
          const session = await fetch(new URL("/api/auth/get-session", base));
          assert.equal(await session.json(), null);
        },
      );
      await t.test(
        "registration creates only its own test account and duplicates have a generic response",
        async () => {
          const signup = await post("sign-up/email", {
            name: "  Auth test member  ",
            email,
            password,
          });
          assert.equal(signup.status, 200);
          assert.equal((await signup.json()).user.name, "Auth test member");
          const row = await db.user.findUnique({
            where: { email },
            select: { id: true },
          });
          assert.ok(row);
          ownedId = row.id;
          assert.equal(
            signup.headers
              .getSetCookie()
              .some((value) => value.includes("session_token=")),
            false,
          );
          const duplicate = await post("sign-up/email", {
            name: "  Auth test member  ",
            email,
            password,
          });
          assert.equal(duplicate.status, 200);
          assert.equal((await duplicate.json()).user.name, "Auth test member");
          assert.equal(
            duplicate.headers
              .getSetCookie()
              .some((value) => value.includes("session_token=")),
            false,
          );
        },
      );
      await t.test(
        "invalid login is generic, trusted-origin checks hold, and rememberMe controls cookie persistence",
        async () => {
          const badPassword = await post("sign-in/email", {
            email,
            password: "an intentionally wrong password",
          });
          const unknownEmail = await post("sign-in/email", {
            email: `missing-${email}`,
            password,
          });
          assert.equal(badPassword.status, 401);
          assert.equal(unknownEmail.status, 401);
          assert.equal(
            (await badPassword.json()).code,
            (await unknownEmail.json()).code,
          );
          const blocked = await post(
            "sign-in/email",
            { email, password },
            "",
            "https://untrusted.example.invalid",
          );
          assert.equal(blocked.status, 403);
          const login = await post("sign-in/email", {
            email,
            password,
            rememberMe: false,
          });
          assert.equal(login.status, 200);
          const header = login.headers
            .getSetCookie()
            .find((value) => value.startsWith("bryxtv.session_token="));
          assert.ok(header);
          assert.ok(/httponly/i.test(header));
          assert.ok(/samesite=lax/i.test(header));
          assert.equal(/max-age=/i.test(header), false);
          cookie = header.split(";")[0]!;
        },
      );
      await t.test(
        "server session and profile are authenticated; logout revokes them",
        async () => {
          assert.ok(cookie && ownedId);
          const session = await fetch(new URL("/api/auth/get-session", base), {
            headers: { Cookie: cookie },
          });
          assert.equal((await session.json()).user.id, ownedId);
          const profile = await fetch(new URL("/profile", base), {
            headers: { Cookie: cookie },
            redirect: "manual",
          });
          assert.equal(profile.status, 200);
          assert.ok((await profile.text()).includes("Auth test member"));
          const logout = await post("sign-out", {}, cookie);
          assert.equal(logout.status, 200);
          const expired = await fetch(new URL("/api/auth/get-session", base), {
            headers: { Cookie: cookie },
          });
          assert.equal(await expired.json(), null);
          const protectedPage = await fetch(new URL("/profile", base), {
            headers: { Cookie: cookie },
            redirect: "manual",
          });
          await expectLoginRedirect(protectedPage);
          // This instance uses a session cookie when rememberMe is false. Test the
          // default persistent-cookie flow separately and revoke that session too.
          const remembered = await post("sign-in/email", {
            email,
            password,
            rememberMe: true,
          });
          assert.equal(remembered.status, 200);
          const header = remembered.headers
            .getSetCookie()
            .find((value) => value.startsWith("bryxtv.session_token="));
          assert.ok(header && /max-age=/i.test(header));
          await post("sign-out", {}, header.split(";")[0]!);
        },
      );
    } finally {
      // Delete only the disposable account created by this invocation. Relations
      // cascade through the reviewed auth schema; unrelated users are untouched.
      const owned =
        ownedId ??
        (await db.user.findUnique({ where: { email }, select: { id: true } }))
          ?.id;
      if (owned) await db.user.deleteMany({ where: { id: owned, email } });
      await db.$disconnect();
    }
  },
);
