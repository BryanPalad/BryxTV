import { test } from "node:test";
import assert from "node:assert/strict";
import { handleWatchlist, type WatchlistHandlers } from "../src/features/watchlist/handler";
import { watchlistInput, watchlistKey, type WatchlistTitle } from "../src/features/watchlist/types";
import { watchlistMetadata } from "../src/features/watchlist/metadata";
import { safeReturnTo } from "../src/lib/auth/redirect";
const origin = process.env.BETTER_AUTH_URL || "http://localhost:3001";
function fixture() {
  let user: string | null = "alice";
  const rows = new Map<string, WatchlistTitle>();
  const deps: WatchlistHandlers = {
    getUser: async () => user,
    list: async id => [...rows.entries()].filter(([key]) => key.startsWith(`${id}/`)).map(([,item]) => item),
    has: async (id,item) => rows.has(`${id}/${watchlistKey(item)}`),
    add: async (id,item) => { rows.set(`${id}/${watchlistKey(item)}`,item); },
    remove: async (id,item) => { rows.delete(`${id}/${watchlistKey(item)}`); },
  };
  return { deps, as: (id: string | null) => { user = id; }, request: (method: string, body?: unknown, requestOrigin = new URL(origin).origin) => handleWatchlist(new Request(`${origin}/api/watchlist`, {
    method, headers: { origin: requestOrigin, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }),deps) };
}
test("movies and TV are saved independently; duplicates/removals are idempotent and ownership is isolated", async () => {
  const f=fixture();
  assert.deepEqual((await (await f.request("GET")).json()).items,[]);
  const movie={tmdbId:550,mediaType:"movie"}, tv={tmdbId:550,mediaType:"tv"};
  for(const item of [movie,movie,tv]) assert.equal((await f.request("POST",item)).status,200);
  let response=await f.request("GET");
  assert.equal(response.headers.get("cache-control"),"private, no-store");
  assert.equal((await response.json()).items.length,2);
  f.as("bob");
  assert.deepEqual((await (await f.request("GET")).json()).items,[]);
  await f.request("DELETE",movie);
  f.as("alice");
  assert.equal((await (await f.request("GET")).json()).items.length,2);
  for(let n=0;n<2;n++) assert.equal((await f.request("DELETE",movie)).status,200);
  assert.deepEqual((await (await f.request("GET")).json()).items,[tv]);
  await f.request("DELETE",tv);
  response=await f.request("GET");
  assert.deepEqual((await response.json()).items,[]);
});
test("watchlist rejects invalid titles, client user IDs, unauthenticated requests, and cross-origin mutations", async () => {
  const f=fixture();
  for(const item of [
    {tmdbId:1,mediaType:"person"},{tmdbId:0,mediaType:"movie"},{tmdbId:-1,mediaType:"tv"},
    {tmdbId:1.5,mediaType:"tv"},{tmdbId:"1",mediaType:"movie"},{tmdbId:2147483648,mediaType:"movie"},
    {tmdbId:1,mediaType:"movie",userId:"bob"},null,
  ]) assert.equal((await f.request("POST",item)).status,400);
  assert.equal((await f.request("POST",{tmdbId:1,mediaType:"movie"},"https://evil.test")).status,403);
  f.as(null);
  for(const method of ["GET","POST","DELETE"]) assert.equal((await f.request(method,method==="GET"?undefined:{tmdbId:1,mediaType:"movie"})).status,401);
  f.as("alice");f.deps.list=async()=>{throw new Error("private database credentials");};
  const failure=await f.request("GET");
  assert.equal(failure.status,503);
  assert.doesNotMatch(await failure.text(),/credentials/);
});
test("metadata failures preserve records, order, and controlled concurrency", async () => {
  const titles=Array.from({length:20},(_,i)=>watchlistInput.parse({tmdbId:i+1,mediaType:i%2?"tv":"movie"}));
  let active=0,peak=0;
  const results=await watchlistMetadata(titles,async()=>{
    active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,1));active--;
    throw new Error("TMDB is unavailable");
  });
  assert.equal(results.length,20);
  assert.ok(peak<=6);
  assert.deepEqual(results.map(({item,...key})=>{assert.equal(item,null);return key;}),titles);
});
test("My List and title login return URLs remain internal and allowlisted",()=>{
  for(const path of ["/my-list","/my-list?type=tv&page=2","/movie/550","/tv/1399"]) assert.equal(safeReturnTo(path),path);
  for(const path of ["//evil.test","https://evil.test","/my-list/../../api/auth/sign-out"]) assert.equal(safeReturnTo(path),"/profile");
});

test("saved-state checks use the authenticated owner and reject malformed query values", async () => {
  const f=fixture();await f.deps.add("alice",{tmdbId:550,mediaType:"movie"});
  const request=(query:string)=>handleWatchlist(new Request(`${origin}/api/watchlist?${query}`),f.deps);
  assert.equal((await (await request("tmdbId=550&mediaType=movie")).json()).saved,true);
  f.as("bob");
  assert.equal((await (await request("tmdbId=550&mediaType=movie")).json()).saved,false);
  for(const query of ["tmdbId=bad&mediaType=tv","tmdbId=1&mediaType=person","tmdbId=1&mediaType=movie&userId=alice","tmdbId=1&tmdbId=2&mediaType=movie"])
    assert.equal((await request(query)).status,400);
});
