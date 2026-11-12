import { test, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3001" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
});
const originalFetch = globalThis.fetch;
let handleFetch: typeof fetch;
globalThis.fetch = (...args) => handleFetch(...args);
after(() => { globalThis.fetch = originalFetch; });
const { render, fireEvent, waitFor, cleanup } = await import("@testing-library/react");
const { GoogleSignInButton } = await import("../../src/features/auth/components/google-sign-in-button");
afterEach(() => cleanup());

test("invitation-only registration omits the password divider", () => {
  const view = render(<GoogleSignInButton enabled returnTo="/" showEmailDivider={false} />);
  assert.ok(view.getByRole("button", { name: "Continue with Google" }));
  assert.equal(view.queryByText("or continue with email"), null);
});

test("Google button initiates social sign-in with safe callbacks, stays busy, and prevents duplicate requests", async () => {
  const calls: unknown[] = [];
  handleFetch = async (input, init) => {
    assert.match(String(input), /\/api\/auth\/sign-in\/social$/);
    assert.equal(init?.method, "POST");
    calls.push(JSON.parse(String(init?.body)));
    return Response.json({ url: "https://accounts.google.com/o/oauth2/v2/auth", redirect: false });
  };
  const view = render(<GoogleSignInButton enabled returnTo="//evil.example" />);
  const button = view.getByRole("button", { name: "Continue with Google" }) as HTMLButtonElement;
  assert.equal(button.type, "button");
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => assert.equal(calls.length, 1));
  assert.deepEqual(calls[0], {
    provider: "google", callbackURL: "/profile", newUserCallbackURL: "/profile",
    errorCallbackURL: "/login?oauth=error&returnTo=%2Fprofile",
  });
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute("aria-busy"), "true");
  assert.match(button.textContent!, /Connecting to Google/);
});

test("provider and network failures show a safe alert and allow retry", async () => {
  let calls = 0;
  handleFetch = async () => {
    if (++calls === 1) return Response.json({ message: "private provider error" }, { status: 503 });
    throw new Error("sensitive transport details");
  };
  const view = render(<GoogleSignInButton enabled returnTo="/movies" />);
  const button = view.getByRole("button", { name: "Continue with Google" }) as HTMLButtonElement;
  for (let i = 0; i < 2; i++) {
    fireEvent.click(button);
    await waitFor(() => assert.equal(button.disabled, false));
    assert.match(view.getByRole("alert").textContent!, /Unable to continue with Google/);
    assert.doesNotMatch(view.container.textContent!, /private provider|sensitive transport/);
  }
  assert.equal(calls, 2);
});

test("missing provider configuration disables Google without blocking the email alternative", () => {
  const view = render(<GoogleSignInButton enabled={false} returnTo="/profile" />);
  assert.equal((view.getByRole("button") as HTMLButtonElement).disabled, true);
  assert.match(view.container.textContent!, /use email below/);
});

test("profile Connect Google initiates explicit linking without a sign-in request", async () => {
  let calls = 0;
  handleFetch = async (input, init) => {
    calls++;
    assert.match(String(input), /\/api\/auth\/link-social$/);
    assert.deepEqual(JSON.parse(String(init?.body)), {
      provider: "google", callbackURL: "/profile", errorCallbackURL: "/profile?oauth=error",
    });
    return Response.json({ url: "https://accounts.google.com/o/oauth2/v2/auth", redirect: false });
  };
  const view = render(<GoogleSignInButton enabled returnTo="/profile" mode="link" />);
  const button = view.getByRole("button", { name: "Connect Google" }) as HTMLButtonElement;
  fireEvent.click(button);
  await waitFor(() => assert.equal(calls, 1));
  assert.equal(button.disabled, true);
  assert.doesNotMatch(view.container.textContent!, /or continue with email/);
});


test("profile and compact avatars render Google images, recover from failures, and accept a refreshed picture", async () => {
  const { ProfileAvatar } = await import("../../src/features/auth/components/profile-avatar");
  const first = "https://lh3.googleusercontent.com/a/first";
  const second = "https://lh3.googleusercontent.com/a/second";
  const view = render(<ProfileAvatar name="Test Member" image={first} />);
  const image = view.container.querySelector("img")!;
  assert.equal(image.getAttribute("src"), first);
  fireEvent.error(image);
  assert.equal(view.container.querySelector("img"), null);
  assert.equal(view.container.textContent, "TM");
  view.rerender(<ProfileAvatar name="Test Member" image={second} compact />);
  assert.equal(view.container.querySelector("img")?.getAttribute("src"), second);
  assert.equal(view.container.querySelector("img")?.getAttribute("width"), "34");
});
