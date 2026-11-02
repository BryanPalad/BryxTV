import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import nextEnv from "@next/env";
const origin=process.env.BRYX_PLAYBACK_TEST_ORIGIN;
test("development source API verifies policy, identity, ordering, pending status and uniqueness without private evidence",{skip:!origin,timeout:120000},async()=>{
  const base=new URL(origin!);assert.ok(["localhost","127.0.0.1"].includes(base.hostname));nextEnv.loadEnvConfig(process.cwd());
  const {verifyDevelopmentDatabase}=await import("../scripts/development-db");await verifyDevelopmentDatabase();
  const {getPrisma}=await import("../src/lib/db/prisma");const db=getPrisma();
  const tag=randomUUID(), sourceIds:string[]=[];let createdProvider=false;let providerId="";
  let createdHlsProvider:string|null=null;
  let ownedUser:{id:string;email:string}|null=null;
  const tmdbId=1700000000+Math.floor(Math.random()*1000000);
  async function get(query:string) {return fetch(new URL(`/api/playback-sources?${query}`,base));}
  try {
    let provider=await db.playbackProvider.findUnique({where:{slug:"local-mp4"}});
    if(!provider){provider=await db.playbackProvider.create({data:{slug:"local-mp4",name:"BryxTV MP4",type:"VIDEOJS_MP4",enabled:true}});createdProvider=true;}
    assert.equal(provider.enabled,true,"Existing provider must be enabled; refuse to change its configuration.");providerId=provider.id;
    const identity={mediaType:"movie" as const,tmdbId,contentKey:`movie:${tmdbId}`};
    const data={...identity,providerId,displayLabel:`Temporary test ${tag}`,sourceUrl:"/playback/big-buck-bunny-excerpt.mp4",enabled:true,authorizationVerified:true,authorizationEvidence:"Disposable test fixture; NOT a real movie mapping. Do not retain.",priority:20};
    const one=await db.playbackSource.create({data});sourceIds.push(one.id);
    let r=await get(`mediaType=movie&tmdbId=${tmdbId}`);assert.equal(r.status,200);let body=await r.json();assert.deepEqual(body.sources,[]);assert.equal(body.pending,true);
    await db.playbackSource.update({where:{id:one.id},data:{availabilityStatus:"AVAILABLE",verificationEvidence:"Existing local sample verified; test mapping only",lastCheckedAt:new Date()}});
    let hls=await db.playbackProvider.findUnique({where:{slug:"local-hls"}});
    if(!hls){hls=await db.playbackProvider.create({data:{slug:"local-hls",name:"BryxTV HLS",type:"VIDEOJS_HLS",enabled:true}});createdHlsProvider=hls.id;}
    assert.equal(hls.enabled,true);
    const two=await db.playbackSource.create({data:{...data,providerId:hls.id,sourceUrl:"/playback/bbb-hls/index.m3u8",priority:1,availabilityStatus:"AVAILABLE",verificationEvidence:"Synthetic policy test fixture; no playback claim",lastCheckedAt:new Date()}});sourceIds.push(two.id);
    r=await get(`mediaType=movie&tmdbId=${tmdbId}`);body=await r.json();assert.deepEqual(body.sources.map((s:{id:string})=>s.id),[two.id,one.id]);assert.equal("authorizationEvidence" in body.sources[0],false);assert.equal("providerId" in body.sources[0],false);
    await assert.rejects(()=>db.playbackSource.create({data}),/./);
    const email=`bryxtv-provider-test-${tag}@example.invalid`, password=randomUUID()+randomUUID();
    const signup=await fetch(new URL("/api/auth/sign-up/email",base),{method:"POST",headers:{origin:base.origin,"content-type":"application/json"},body:JSON.stringify({name:"Provider Test",email,password})});assert.equal(signup.status,200);const account=await signup.json();ownedUser={id:account.user.id,email};
    const login=await fetch(new URL("/api/auth/sign-in/email",base),{method:"POST",headers:{origin:base.origin,"content-type":"application/json"},body:JSON.stringify({email,password})});assert.equal(login.status,200);const cookie=login.headers.getSetCookie().map(value=>value.split(";")[0]).join("; ");
    await db.viewingProgress.create({data:{...identity,userId:ownedUser.id,positionSeconds:30,durationSeconds:120,observedAt:new Date()}});
    async function continuing(){return (await (await fetch(new URL("/api/viewing-progress?continue=1",base),{headers:{cookie}})).json()).items;}
    const history=await continuing();assert.equal(history.length,1);assert.equal(history[0].watchHref,`/watch/movie/${tmdbId}?source=${two.id}`);

    await db.playbackSource.update({where:{id:two.id},data:{authorizationVerified:false}});body=await (await get(`mediaType=movie&tmdbId=${tmdbId}`)).json();assert.equal(body.sources.length,1);
    await db.playbackSource.update({where:{id:one.id},data:{availabilityStatus:"UNAVAILABLE"}});body=await (await get(`mediaType=movie&tmdbId=${tmdbId}`)).json();assert.equal(body.sources.length,0);assert.equal(body.unavailable,true);
    assert.equal((await continuing()).length,0);assert.equal((await db.viewingProgress.findFirst({where:{userId:ownedUser.id}}))?.positionSeconds,30);
    for(const episodeNumber of [1,2]){const row=await db.playbackSource.create({data:{...data,mediaType:"tv",contentKey:`tv:${tmdbId}:1:${episodeNumber}`,seasonNumber:1,episodeNumber}});sourceIds.push(row.id);}
    assert.equal((await get(`mediaType=tv&tmdbId=${tmdbId}`)).status,400);
    body=await (await get(`mediaType=tv&tmdbId=${tmdbId}&seasonNumber=1&episodeNumber=2`)).json();assert.equal(body.pending,true);
    for(const query of ["mediaType=movie&tmdbId=0","mediaType=movie&tmdbId=42&sourceUrl=https://evil.test","mediaType=movie&tmdbId=42&tmdbId=43","mediaType=movie&tmdbId=42&seasonNumber=1&episodeNumber=1"])assert.equal((await get(query)).status,400);
    const guest=await get("mediaType=movie&tmdbId=2147483647");assert.equal(guest.status,200);assert.equal(guest.headers.get("cache-control"),"private, no-store");assert.deepEqual((await guest.json()).sources,[]);
  } finally {
    if(ownedUser)await db.user.deleteMany({where:{id:ownedUser.id,email:ownedUser.email}});
    await db.playbackSource.deleteMany({where:{id:{in:sourceIds},displayLabel:`Temporary test ${tag}`}});
    if(createdHlsProvider)await db.playbackProvider.deleteMany({where:{id:createdHlsProvider,sources:{none:{}}}});
    if(createdProvider)await db.playbackProvider.deleteMany({where:{id:providerId,sources:{none:{}}}});
    await db.$disconnect();
  }
});

test("reviewed official catalog keeps internal, provider-only, candidate and unavailable states separate",{skip:!origin,timeout:120000},async()=>{
 const {verifyDevelopmentDatabase}=await import("../scripts/development-db");nextEnv.loadEnvConfig(process.cwd());await verifyDevelopmentDatabase();
 async function query(path:string){const response=await fetch(new URL(path,origin!));assert.equal(response.status,200);return response.json();}
 const playable=await query('/api/playback-sources?mediaType=tv&tmdbId=63926&seasonNumber=3&episodeNumber=1');
 assert.equal(playable.availability,"WATCH_ON_BRYXTV");assert.equal(playable.sources.length,1);assert.equal(playable.sources[0].sourceUrl,"https://www.youtube-nocookie.com/embed/t7KlZ38p39w");
 assert.equal(playable.sources[0].progressTracking,"unsupported");assert.equal(JSON.stringify(playable).includes("evidence"),false);
 const wrong=await query('/api/playback-sources?mediaType=tv&tmdbId=63926&seasonNumber=1&episodeNumber=25');assert.equal(wrong.sources.length,0);
 const candidate=await query('/api/playback-sources?mediaType=movie&tmdbId=640828');assert.equal(candidate.availability,"UNKNOWN");assert.equal(candidate.sources.length,0);
 const compilationEpisode=await query('/api/playback-sources?mediaType=tv&tmdbId=244625&seasonNumber=1&episodeNumber=1');assert.equal(compilationEpisode.availability,"UNAVAILABLE");assert.equal(compilationEpisode.sources.length,0);
 const {getPrisma}=await import("../src/lib/db/prisma");const db=getPrisma();
 const valkaama=await db.playbackSource.findUnique({where:{id:"cmvl2hp6x0000edsb4r2a9mqi"}});assert.equal(valkaama?.enabled,false);assert.equal(valkaama?.availabilityStatus,"UNKNOWN");
 const internal=await fetch(new URL('/watch/tv/63926?season=3&episode=1',origin!));const internalHTML=await internal.text();assert.equal(internal.status,200);assert.ok(internalHTML.includes('youtube-nocookie.com/embed/t7KlZ38p39w'));assert.equal(internalHTML.includes('Development verification'),false);
 const external=await fetch(new URL('/tv/244625',origin!));const externalHTML=await external.text();assert.equal(external.status,200);assert.ok(externalHTML.includes('https://www.youtube.com/watch?v=dBdEWgtknLM'));assert.equal(externalHTML.includes('href="/watch/tv/244625?'),false);
});

test("expanded approved anime resolves publicly; episode navigation and watchable rows do not promote candidates",{skip:!origin,timeout:120000},async()=>{
 nextEnv.loadEnvConfig(process.cwd());
 const {verifyDevelopmentDatabase}=await import("../scripts/development-db");await verifyDevelopmentDatabase();
 async function request(path:string) { const response=await fetch(new URL(path,origin!),{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);return response; }
 for(const [id,season,episode,video] of [[63926,3,2,"gew-sOx4oyA"],[1429,1,1,"eGjGTYyq41c"]] as const){
  const response=await request(`/api/playback-sources?mediaType=tv&tmdbId=${id}&seasonNumber=${season}&episodeNumber=${episode}`);
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.availability,"WATCH_ON_BRYXTV");assert.equal(body.sources.length,1);assert.equal(body.sources[0].sourceUrl,`https://www.youtube-nocookie.com/embed/${video}`);assert.equal(body.sources[0].progressTracking,"unsupported");
 }
 const candidate=await(await request('/api/playback-sources?mediaType=tv&tmdbId=72165&seasonNumber=1&episodeNumber=1')).json();assert.equal(candidate.availability,"UNKNOWN");assert.deepEqual(candidate.sources,[]);
 const {JSDOM}=await import("jsdom");
 const hrefs=(element:Element)=>Array.from(element.querySelectorAll("a")).map(a=>a.getAttribute("href"));
 const first=new JSDOM(await(await request('/watch/tv/63926?season=3&episode=1')).text());
 const next=first.window.document.querySelector('nav[aria-label="Episode navigation"]');assert.ok(next);assert.match(next!.textContent!,/Next Episode/);assert.ok(hrefs(next!).includes("/watch/tv/63926?season=3&episode=2"),next!.outerHTML);
 const second=new JSDOM(await(await request('/watch/tv/63926?season=3&episode=2')).text());
 const nav=second.window.document.querySelector('nav[aria-label="Episode navigation"]')!;assert.ok(hrefs(nav).includes("/watch/tv/63926?season=3&episode=1"));assert.match(nav.textContent!,/Next Episode — Unavailable/);assert.equal(hrefs(nav).some(href=>href?.includes("episode=3")),false);assert.ok(nav.querySelector('a[href="/tv/63926?season=3#episodes-heading"]'));
 const home=new JSDOM(await(await request('/')).text());
 const watchable=home.window.document.getElementById('watchable-anime');assert.ok(watchable);assert.ok(watchable!.querySelector('a[href="/tv/1429"]'));assert.ok(watchable!.querySelector('a[href="/tv/63926"]'));assert.equal(home.window.document.getElementById('watchable-k-dramas'),null);
 for(const dom of [first,second,home])dom.window.close();
});
