import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
const origin=process.env.BRYX_HISTORY_TEST_ORIGIN;
test("development history API: isolation, uniqueness, stale updates, pagination, completion and persistence",{skip:!origin,timeout:180000},async()=>{
  const base=new URL(origin!);assert.ok(["localhost","127.0.0.1"].includes(base.hostname));
  nextEnv.loadEnvConfig(process.cwd());
  const {getPrisma}=await import("../src/lib/db/prisma");const db=getPrisma();
  const branch=await db.$queryRaw<{id:string}[]>`SELECT current_setting('neon.branch_id',true) AS id`;assert.equal(branch[0]?.id,"br-raspy-sun-az80iq7r","Refuse writes outside development");
  const owned:{id:string;email:string}[]=[],cookies:string[]=[];
  const tag=randomBytes(12).toString("hex"),password=randomBytes(24).toString("base64url");
  async function call(path:string,method="GET",body?:object,cookie="",requestOrigin=base.origin) {return fetch(new URL(path,base),{method,redirect:"manual",headers:{origin:requestOrigin,"content-type":"application/json",cookie},...(body?{body:JSON.stringify(body)}:{})});}
  const put=(target:object,cookie=cookies[0],patch:object={})=>call("/api/viewing-progress","PUT",{...target,positionSeconds:30,durationSeconds:120,observedAt:Date.now()-1000,...patch},cookie);
  try {
    assert.equal((await call("/api/viewing-progress")).status,401);
    assert.equal((await put({mediaType:"movie",tmdbId:42},"")).status,401);
    for(const suffix of ["a","b"]) {
      const email=`bryxtv-history-test-${tag}-${suffix}@example.invalid`;
      const signup=await call("/api/auth/sign-up/email","POST",{name:"History Test",email,password});assert.equal(signup.status,200);const body=await signup.json();owned.push({id:body.user.id,email});
      const login=await call("/api/auth/sign-in/email","POST",{email,password});assert.equal(login.status,200);cookies.push(login.headers.getSetCookie().map(v=>v.split(";")[0]).join("; "));
    }
    const movie={mediaType:"movie",tmdbId:42},tv={mediaType:"tv",tmdbId:42,seasonNumber:1,episodeNumber:1},demo={mediaType:"demo",demoId:"big-buck-bunny"};
    const observedAt=Date.now()-2000;
    for(const response of await Promise.all(Array.from({length:4},()=>put(movie,cookies[0],{observedAt}))))assert.equal(response.status,200);
    assert.equal(await db.viewingProgress.count({where:{userId:owned[0]!.id}}),1);
    assert.equal((await put(movie,cookies[0],{positionSeconds:70,observedAt:observedAt+1000})).status,200);
    await put(movie,cookies[0],{positionSeconds:10,observedAt});
    let result=await call("/api/viewing-progress/movie/42","GET",undefined,cookies[0]);assert.equal(result.headers.get("cache-control"),"private, no-store");assert.equal((await result.json()).progress.positionSeconds,70);
    assert.equal((await (await call("/api/viewing-progress/movie/42","GET",undefined,cookies[1])).json()).progress,null);
    await call("/api/viewing-progress","DELETE",movie,cookies[1]);assert.equal(await db.viewingProgress.count({where:{userId:owned[0]!.id}}),1);
    assert.equal((await put({...movie,userId:owned[1]!.id})).status,400);
    assert.equal((await put(movie,cookies[0],{positionSeconds:-1})).status,400);
    assert.equal((await put({...tv,episodeNumber:0})).status,400);
    assert.equal((await call("/api/viewing-progress","PUT",{...movie,positionSeconds:1,durationSeconds:10,observedAt:Date.now()},cookies[0],"https://evil.invalid")).status,403);
    assert.equal((await call("/api/viewing-progress/tv/42","GET",undefined,cookies[0])).status,400);
    for(const episodeNumber of [1,1,2]) assert.equal((await put({...tv,episodeNumber})).status,200);
    assert.equal(await db.viewingProgress.count({where:{userId:owned[0]!.id,mediaType:"tv"}}),2);
    assert.equal((await (await call("/api/viewing-progress/tv/42?season=1&episode=2","GET",undefined,cookies[0])).json()).progress.episodeNumber,2);
    assert.equal((await put(demo,cookies[0],{positionSeconds:3,durationSeconds:10})).status,200);
    result=await call("/api/viewing-progress?continue=1","GET",undefined,cookies[0]);let page=await result.json();assert.equal(page.items.length,1);assert.equal(page.items[0].watchHref,"/watch/demo/big-buck-bunny");
    assert.equal((await put(demo,cookies[0],{positionSeconds:10,durationSeconds:10,ended:true,observedAt:Date.now()})).status,200);
    assert.equal((await (await call("/api/viewing-progress?continue=1","GET",undefined,cookies[0])).json()).items.length,0);
    page=await (await call("/api/viewing-progress?type=demo","GET",undefined,cookies[0])).json();assert.equal(page.items[0].completed,true);
    // Seed only this disposable user's own rows to verify real pagination without expensive repeated metadata.
    await db.viewingProgress.createMany({data:Array.from({length:25},(_,i)=>({userId:owned[0]!.id,contentKey:`movie:${1000000000+i}`,mediaType:"movie",tmdbId:1000000000+i,positionSeconds:10,durationSeconds:100,observedAt:new Date()}))});
    page=await (await call("/api/viewing-progress?type=movie&page=2","GET",undefined,cookies[0])).json();assert.equal(page.page,2);assert.equal(page.totalPages,2);assert.equal(page.items.length,2);assert.equal(page.items[0].watchHref,null);assert.match(page.items[0].title,/Movie #/);
    const freshLogin=await call("/api/auth/sign-in/email","POST",{email:owned[0]!.email,password});const fresh=freshLogin.headers.getSetCookie().map(v=>v.split(";")[0]).join("; ");
    assert.equal((await (await call("/api/viewing-progress/movie/42","GET",undefined,fresh)).json()).progress.positionSeconds,70);
    assert.equal((await call("/api/viewing-progress","DELETE",movie,cookies[0])).status,200);
    assert.equal((await (await call("/api/viewing-progress/movie/42","GET",undefined,cookies[0])).json()).progress,null);
    assert.equal((await call("/history","GET",undefined,cookies[0])).status,200);
    const guest=await call("/history");assert.ok(guest.status===307 || (guest.status===200&&(await guest.text()).includes("url=/login?returnTo=%2Fhistory")));
  } finally {for(const user of owned) await db.user.deleteMany({where:{id:user.id,email:user.email}});await db.$disconnect();}
});
