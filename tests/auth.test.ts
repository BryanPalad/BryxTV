import { test } from "node:test";
import assert from "node:assert/strict";
import {
  registrationSchema,
  loginSchema,
  displayNameSchema,
} from "../src/lib/auth/validation";
import { safeReturnTo } from "../src/lib/auth/redirect";
import { authErrorMessage } from "../src/lib/auth/errors";
import { authOptions } from "../src/lib/auth/options";

const registration = {
  name: "  Bryx Member  ",
  email: " MEMBER@example.com ",
  password: "a long unique passphrase",
  confirmPassword: "a long unique passphrase",
};
test("registration validates and normalizes identity while preserving passwords", () => {
  const result = registrationSchema.parse(registration);
  assert.equal(result.name, "Bryx Member");
  assert.equal(result.email, "member@example.com");
  assert.equal(result.password, registration.password);
  for (const change of [
    { name: "x" },
    { name: "x".repeat(61) },
    { name: "bad\u0000name" },
    { email: "invalid" },
    { password: "short", confirmPassword: "short" },
    { password: "x".repeat(129), confirmPassword: "x".repeat(129) },
  ])
    assert.equal(
      registrationSchema.safeParse({ ...registration, ...change }).success,
      false,
    );
});
test("password confirmation produces an accessible field-specific validation issue", () => {
  const result = registrationSchema.safeParse({
    ...registration,
    confirmPassword: "different",
  });
  assert.equal(result.success, false);
  if (!result.success)
    assert.ok(
      result.error.issues.some((issue) => issue.path[0] === "confirmPassword"),
    );
});
test("login validates required credentials and correctly supports rememberMe", () => {
  assert.equal(
    loginSchema.parse({
      email: "TEST@example.com",
      password: "password",
      rememberMe: false,
    }).rememberMe,
    false,
  );
  assert.equal(
    loginSchema.safeParse({ email: "invalid", password: "", rememberMe: true })
      .success,
    false,
  );
  assert.equal(
    loginSchema.safeParse({
      email: "test@example.com",
      password: "valid",
      rememberMe: "false",
    }).success,
    false,
  );
});
test("login errors are generic and never include account existence or provider messages", () => {
  assert.equal(
    authErrorMessage("login", 401),
    "Email or password is incorrect.",
  );
  assert.match(authErrorMessage("login", 403), /Access denied/);
  assert.match(authErrorMessage("login", 429), /wait a minute/);
  assert.match(authErrorMessage("logout", 503), /Unable to log out/);
  assert.match(
    authErrorMessage("register", 422),
    /sign in if you already have an account/,
  );
});
test("safe redirects allow known local pages and reject open redirects and auth loops", () => {
  for (const value of [
    "/",
    "/profile",
    "/movies",
    "/search?q=Dune&page=2",
    "/watch/tv/1399?season=1&episode=2",
    "/watch/demo/big-buck-bunny",
    "/movie/550",
    "/tv/1399#episodes",
  ])
    assert.equal(safeReturnTo(value), value);
  for (const value of [
    undefined,
    ["/movies"],
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/%252f%252fevil.test",
    "/%5cevil.test",
    "/%0aevil.test",
    "javascript:alert(1)",
    "/api/auth/sign-out",
    "/login",
    "/register",
    "/unknown",
    "/bad\u0000path",
    "/%",
    "/" + "x".repeat(2048),
  ])
    assert.equal(safeReturnTo(value), "/profile");
});
test("auth policy prevents enumeration, uses database sessions, and validates display names server-side", async () => {
  assert.equal(authOptions.emailAndPassword.autoSignIn, false);
  assert.equal(authOptions.emailAndPassword.minPasswordLength, 12);
  assert.equal(authOptions.session.cookieCache.enabled, false);
  assert.equal(authOptions.rateLimit.enabled, true);
  assert.equal(authOptions.emailAndPassword.requireEmailVerification, false);
  assert.equal(displayNameSchema.safeParse("A\u0000B").success, false);
  await assert.rejects(() =>
    authOptions.databaseHooks.user.create.before({ name: "x" } as never),
  );
});
