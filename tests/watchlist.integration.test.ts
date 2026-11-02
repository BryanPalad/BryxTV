import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
const origin=process.env.BRYX_WATCHLIST_TEST_ORIGIN;
test("development watchlist: real database uniqueness, ownership, persistence and guest protection",{skip:!origin,timeout:120000},async()=>{
  const base=new URL(origin!);
  assert.ok(["localhost","127.0.0.1"].includes(base.hostname));
  nextEnv.loadEnvConfig(process.cwd());
  const {getPrisma}=await import("../src/lib/db/prisma");const db=getPrisma();
  const branch=await db.$queryRaw<{id:string}[]>`SELECT current_setting('neon.branch_id',true) AS id`;
  assert.equal(branch[0]?.id,"br-raspy-sun-az80iq7r","Refuse writes outside verified development branch");
  const tag=randomBytes(12).toString("hex");
  const owned:{id:string;email:string}[]=[];
  const password=randomBytes(24).toString("base64url");
  async function call(path:string,method="GET",body?:object,cookie="") {
    return fetch(new URL(path,base),{method,redirect:"manual",headers:{origin:base.origin,"content-type":"application/json",cookie},...(body?{body:JSON.stringify(body)}:{})});
  }
  try {
    assert.equal((await call("/api/watchlist")).status,401);
    const cookies:string[]=[];
    for(const suffix of ["a","b"]) {
      const email=`bryxtv-watchlist-test-${tag}-${suffix}@example.invalid`;
      const signup=await call("/api/auth/sign-up/email","POST",{name:"Watchlist Test",email,password});
      assert.equal(signup.status,200);const body=await signup.json();owned.push({id:body.user.id,email});
      const login=await call("/api/auth/sign-in/email","POST",{email,password});assert.equal(login.status,200);
      cookies.push(login.headers.getSetCookie().map(value=>value.split(";")[0]).join("; "));
    }
    const movie={tmdbId:550,mediaType:"movie"},tv={tmdbId:1399,mediaType:"tv"};
    assert.deepEqual((await (await call("/api/watchlist","GET",undefined,cookies[0])).json()).items,[]);
    for(const response of await Promise.all(Array.from({length:4},()=>call("/api/watchlist","POST",movie,cookies[0]))))assert.equal(response.status,200);
    assert.equal((await call("/api/watchlist","POST",tv,cookies[0])).status,200);
    assert.equal(await db.watchlistItem.count({where:{userId:owned[0]!.id}}),2);
    assert.equal((await (await call("/api/watchlist?tmdbId=550&mediaType=movie","GET",undefined,cookies[0])).json()).saved,true);
    assert.equal((await (await call("/api/watchlist?tmdbId=550&mediaType=movie","GET",undefined,cookies[1])).json()).saved,false);
    assert.deepEqual((await (await call("/api/watchlist","GET",undefined,cookies[1])).json()).items,[]);
    await call("/api/watchlist","DELETE",movie,cookies[1]);
    assert.equal(await db.watchlistItem.count({where:{userId:owned[0]!.id}}),2);
    assert.equal((await call("/api/watchlist","POST",{...movie,userId:owned[1]!.id},cookies[0])).status,400);
    assert.equal((await call("/api/watchlist","POST",{tmdbId:0,mediaType:"person"},cookies[0])).status,400);
    const own=await call("/api/watchlist","GET",undefined,cookies[0]);
    assert.equal(own.headers.get("cache-control"),"private, no-store");
    const items=(await own.json()).items;assert.equal(items.length,2);assert.equal(items[0].mediaType,"tv");
    // A separate login creates a fresh session, exercising persistent device-independent storage.
    const login=await call("/api/auth/sign-in/email","POST",{email:owned[0]!.email,password});
    const fresh=login.headers.getSetCookie().map(v=>v.split(";")[0]).join("; ");
    assert.equal((await (await call("/api/watchlist","GET",undefined,fresh)).json()).items.length,2);
    for(let i=0;i<2;i++) assert.equal((await call("/api/watchlist","DELETE",movie,cookies[0])).status,200);
    assert.equal(await db.watchlistItem.count({where:{userId:owned[0]!.id}}),1);
    const page=await call("/my-list","GET",undefined,cookies[0]);assert.equal(page.status,200);assert.match(await page.text(),/My List/);
    const guest=await call("/my-list");
    assert.ok(guest.status===307 || (guest.status===200 && (await guest.text()).includes("url=/login?returnTo=%2Fmy-list")));
  } finally {
    for(const user of owned) await db.user.deleteMany({where:{id:user.id,email:user.email}});
    await db.$disconnect();
  }
});
