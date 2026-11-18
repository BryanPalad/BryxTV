import { test, after } from "node:test";
import assert from "node:assert/strict";
import { providerEligible } from "../src/features/playback/providers/eligibility";
import { providerAllowsURL, providers } from "../src/features/playback/providers/registry";
import { developmentPreviewOption } from "../src/features/playback/providers/policy";
import { resolveSources, titleAvailability, resumableKeys } from "../src/features/playback/providers/resolver";
import { GET } from "../src/app/api/playback-sources/route";
import { historyPage } from "../src/features/history/server";

// Isolated in-memory Prisma stand-in. No database connection or mutation.
const target = { mediaId: "tmdb:tv:63926", season: 3, episode: 1 };
const historical = { id:"historical", contentKey:"tv:63926:3:1", mediaType:"tv", tmdbId:63926, seasonNumber:3, episodeNumber:1, sourceUrl:"https://www.youtube-nocookie.com/embed/t7KlZ38p39w", displayLabel:"Historical review", priority:1, enabled:true, authorizationVerified:true, authorizationEvidence:"Historical rights evidence", availabilityStatus:"AVAILABLE", verificationEvidence:"Historical playback evidence", lastCheckedAt:new Date(), provider:{slug:"youtube-privacy",type:"EXTERNAL_EMBED",enabled:true} };
let sources = [historical];
const now = new Date();
const progress = {id:"progress",userId:"owner",contentKey:historical.contentKey,mediaType:"tv",tmdbId:63926,demoId:null,seasonNumber:3,episodeNumber:1,positionSeconds:30,durationSeconds:120,completed:false,observedAt:now,lastWatchedAt:now,createdAt:now,updatedAt:now};
const queries: {where:{userId:string;contentKey?:unknown}}[]=[];
const globalDB = globalThis as unknown as {bryxtvPrisma?: unknown};
const previous = globalDB.bryxtvPrisma;
globalDB.bryxtvPrisma = {
  playbackSource:{findMany:async()=>sources},
  viewingProgress:{
    count:async(q:typeof queries[number])=>{queries.push(q);return q.where.userId === "owner" ? 1 : 0;},
    findMany:async(q:typeof queries[number])=>{queries.push(q);return q.where.userId === "owner" ? [progress] : [];},
  },
};
after(()=>{globalDB.bryxtvPrisma=previous;});

test("central policy blocks YouTube aliases even when mislabeled as direct media",()=>{
  assert.equal(providerEligible("youtube-privacy"),false);
  for(const host of ["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtube-nocookie.com","r1.googlevideo.com"]) {
    const url=`https://${host}/video.mp4`;
    assert.equal(providerEligible("local-mp4",url),false);
    assert.equal(providerAllowsURL({...providers.get("local-mp4")!,allowedHostnames:[host],validateURL:()=>true},url),false);
  }
  assert.equal(providerEligible("internet-archive","https://archive.org/embed/valkaama"),true);
  assert.equal(developmentPreviewOption(historical,target),null);
  assert.equal(developmentPreviewOption({...historical,enabled:false,availabilityStatus:"UNKNOWN"},target),null);
});

test("public API, direct resolver and shared availability ignore all historical YouTube states",async()=>{
  const snapshot=JSON.stringify(historical);
  for(const availabilityStatus of ["AVAILABLE","UNKNOWN","UNAVAILABLE"]) {
    sources=[{...historical,availabilityStatus}];
    assert.deepEqual(await resolveSources(target),{sources:[],pending:false,unavailable:false,failed:false});
    assert.deepEqual(await titleAvailability("tv",63926),{sources:[],pendingKeys:[],failed:false});
    assert.deepEqual(await resumableKeys([historical.contentKey]),[]);
    const response=await GET(new Request("http://localhost/api/playback-sources?mediaType=tv&tmdbId=63926&seasonNumber=3&episodeNumber=1"));
    assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");
    const body=await response.json();assert.equal(body.availability,"UNAVAILABLE");assert.deepEqual(body.sources,[]);
    assert.equal(JSON.stringify(body).includes("evidence"),false);
  }
  assert.equal(JSON.stringify(historical),snapshot);
});

test("eligible approved non-YouTube sources still resolve with exact episode identity",async()=>{
  sources=[{...historical,sourceUrl:"/playback/sample.mp4",provider:{slug:"local-mp4",type:"VIDEOJS_MP4",enabled:true}}];
  assert.equal((await resolveSources(target)).sources[0]?.type,"VIDEOJS_MP4");
  assert.deepEqual((await resolveSources({...target,episode:2})).sources,[]);
  assert.equal((await titleAvailability("tv",63926)).sources.length,1);
});

test("unavailable Continue Watching preserves progress and owner scope with a details destination",async()=>{
  sources=[historical];
  const snapshot=JSON.stringify(progress);
  const page=await historyPage("owner",{page:1,continuing:true});
  assert.equal(page.items.length,1);assert.equal(page.items[0]?.watchHref,null);
  assert.equal(page.items[0]?.detailsHref,"/tv/63926");assert.equal(page.items[0]?.playbackAvailable,false);
  assert.equal(page.items[0]?.positionSeconds,30);
  assert.equal((await historyPage("other",{page:1,continuing:true})).items.length,0);
  assert.ok(queries.every(q=>!q.where.contentKey));assert.equal(JSON.stringify(progress),snapshot);
});
