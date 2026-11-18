import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { familySessionAllowed } from "../../src/lib/auth/family-policy";
import { safeReturnTo } from "../../src/lib/auth/redirect";

type Session = { user: { id: string; email: string; emailVerified: boolean }; session: { expiresAt: Date } };
let session: Session | null = null;
let authFailure = false;
const allowed = (id = "alice"): Session => ({ user: { id, email: `${id}@example.com`, emailVerified: true }, session: { expiresAt: new Date(Date.now() + 60000) } });
mock.module("../../src/lib/auth/server.ts", { namedExports: { getAuth: () => ({ api: { getSession: async () => { if (authFailure) throw new Error("private failure"); return session; } } }) } });
mock.module("../../src/lib/auth/session.ts", { namedExports: { getSession: async () => familySessionAllowed(session) ? session : null } });
const rows = new Map<string, object>();
const key = (userId: string, target: { mediaType: string; tmdbId?: number }) => `${userId}/${target.mediaType}/${target.tmdbId}`;
mock.module("../../src/features/history/server.ts", { namedExports: {
  allowedIdentity: () => true,
  getProgress: async (userId: string, target: { mediaType: string; tmdbId?: number }) => rows.get(key(userId, target)) ?? null,
  putProgress: async (userId: string, target: { mediaType: string; tmdbId?: number }) => { rows.set(key(userId, target), target); return target; },
  deleteProgress: async (userId: string, target: { mediaType: string; tmdbId?: number }) => { rows.delete(key(userId, target)); },
  historyPage: async (userId: string) => ({ items: [...rows].filter(([k]) => k.startsWith(`${userId}/`)).map(([,v]) => v) }),
  publicProgress: (row: unknown) => row,
} });
const { proxy } = await import("../../src/proxy");
const { handleProgress } = await import("../../src/features/history/handler");

test("Gate F: proxy gates pages, API, media, RSC and forged middleware headers", async () => {
  process.env.BRYXTV_ENV = "staging";
  process.env.STAGING_ALLOWED_EMAILS = "alice@example.com,bob@example.com";
  for (const identity of [null, { ...allowed(), session: { expiresAt: new Date(0) } }, { ...allowed(), user: { ...allowed().user, emailVerified: false } }, allowed("outsider")]) {
    session = identity;
    for (const path of ["/", "/profile", "/my-list", "/history", "/watch/movie/42", "/media/demo.mp4", "/api/watchlist", "/api/viewing-progress", "/api/playback-sources"]) {
      const r = await proxy(new NextRequest(`https://staging.example.com${path}`, { headers: { rsc: "1", "x-middleware-subrequest": "src/proxy:src/proxy:src/proxy" } }));
      assert.equal(r.status, path.startsWith("/api/") ? 403 : 307);
      assert.notEqual(r.headers.get("x-middleware-next"), "1");
    }
  }
  session = allowed();
  assert.equal((await proxy(new NextRequest("https://staging.example.com/my-list"))).headers.get("x-middleware-next"), "1");
  process.env.STAGING_ALLOWED_EMAILS = "bob@example.com";
  assert.equal((await proxy(new NextRequest("https://staging.example.com/api/watchlist"))).status, 403);
  for (const list of ["", "bad-address"]) {
    process.env.STAGING_ALLOWED_EMAILS = list;
    assert.equal((await proxy(new NextRequest("https://staging.example.com/api/watchlist"))).status, 403);
    assert.equal((await proxy(new NextRequest("https://staging.example.com/access-denied"))).status, 403);
  }
  process.env.STAGING_ALLOWED_EMAILS = "alice@example.com,bob@example.com";
  authFailure = true;
  assert.equal((await proxy(new NextRequest("https://staging.example.com/api/watchlist"))).status, 403);
  authFailure = false;
});

test("Gate F: history handler scopes reads, writes and deletes to session owner", async () => {
  process.env.BRYXTV_ENV = "staging";
  process.env.STAGING_ALLOWED_EMAILS = "alice@example.com,bob@example.com";
  process.env.BETTER_AUTH_URL = "https://staging.example.com";
  const call = (method: string, body?: object, path = "/api/viewing-progress", target?: {mediaType: string; tmdbId: string}) => handleProgress(new Request(`https://staging.example.com${path}`, { method, headers: { origin: "https://staging.example.com", "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }), target);
  const target = { mediaType: "movie", tmdbId: 42 };
  const sample = { ...target, positionSeconds: 10, durationSeconds: 100, observedAt: Date.now() - 1000 };
  session = allowed();
  assert.equal((await call("PUT", sample)).status, 200);
  session = allowed("bob");
  assert.deepEqual((await (await call("GET")).json()).items, []);
  assert.equal((await (await call("GET", undefined, "/api/viewing-progress/movie/42", {mediaType:"movie",tmdbId:"42"})).json()).progress, null);
  assert.equal((await call("PUT", { ...sample, userId: "alice" })).status, 400);
  await call("DELETE", target);
  session = allowed();
  assert.equal((await (await call("GET")).json()).items.length, 1);
  process.env.STAGING_ALLOWED_EMAILS = "bob@example.com";
  for (const method of ["GET", "PUT", "DELETE"]) assert.equal((await call(method, method === "GET" ? undefined : sample)).status, 401);
  session = null;
  assert.equal((await call("GET")).status, 401);
});

test("Gate F: malicious return destinations never leave internal routes", () => {
  for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "/%2f%2fevil.example", "/%5cevil.example", "/login", "/api/auth/sign-out", "/profile\n", "/%", "/profile/../../evil"]) assert.equal(safeReturnTo(value), "/profile");
});


test("Gate F: family users have no source approval HTTP methods; developer tools reject production", async () => {
  const routes = await import("../../src/app/api/playback-sources/route");
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(method in routes, false);
  const { previewAllowed } = await import("../../src/features/playback/providers/policy");
  assert.equal(previewAllowed("production", "localhost", true), false);
  assert.equal(previewAllowed("development", "staging.example.com", true), false);
  assert.equal(previewAllowed("development", "localhost", false), false);
  const { verifyDevelopmentDatabase } = await import("../../scripts/development-db");
  const before = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  try { await assert.rejects(verifyDevelopmentDatabase, /Development tool only/); }
  finally { if (before === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: before }); }
});
