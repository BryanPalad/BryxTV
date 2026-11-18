import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProgressInput, progressIdentity, progressKey, sourceIdentity, resumePosition } from "../src/features/history/types";
import { PlayerProgress, ProgressWriter, SAVE_INTERVAL } from "../src/features/history/player-progress";
import { demoSources } from "../src/lib/playback/resolver";
import { presentProgress, progressSource } from "../src/features/history/server";
import type { ProgressSample } from "../src/features/history/types";
import type { PlaybackProgress } from "../src/lib/playback/progress";
const source = demoSources()[0]!;
const target = sourceIdentity(source)!;
const base = { mediaType: "movie", tmdbId: 42, positionSeconds: 30, durationSeconds: 120, observedAt: Date.now() - 1000 };
test("progress validates canonical movie/episode identities, owner injection, finite values and completion", () => {
  assert.equal(progressKey(progressIdentity.parse({mediaType:"movie",tmdbId:42})),"movie:42");
  assert.notEqual(progressKey({mediaType:"tv",tmdbId:42,seasonNumber:1,episodeNumber:1}),progressKey({mediaType:"tv",tmdbId:42,seasonNumber:1,episodeNumber:2}));
  assert.equal(parseProgressInput({...base,positionSeconds:200}).positionSeconds,120);
  assert.equal(parseProgressInput({...base,positionSeconds:114}).completed,true);
  assert.equal(parseProgressInput({...base,ended:true}).completed,true);
  for (const patch of [{userId:"other"},{completed:true},{positionSeconds:-1},{positionSeconds:NaN},{positionSeconds:Infinity},{durationSeconds:0},{durationSeconds:Infinity},{durationSeconds:2592001},{tmdbId:0},{seasonNumber:1},{mediaType:"tv"},{mediaType:"tv",seasonNumber:1,episodeNumber:0},{observedAt:Date.now()+120000}]) assert.throws(()=>parseProgressInput({...base,...patch}));
  assert.equal(sourceIdentity({...source,mediaId:"tmdb:tv:42",season:1,episode:2})?.mediaType,"tv");
  assert.equal(sourceIdentity({...source,mediaId:"tmdb:tv:42"}),null);
});
test("resume rejects completed, near-end, and changed-duration progress",()=>{
  const saved={positionSeconds:30,durationSeconds:120,completed:false};
  assert.equal(resumePosition(saved,120),30);
  assert.equal(resumePosition({...saved,completed:true},120),0);
  assert.equal(resumePosition({...saved,positionSeconds:115},120),0);
  assert.equal(resumePosition(saved,300),0);
});
function fixture(authenticated=true, saved:{positionSeconds:number;durationSeconds:number;completed:boolean}|null=null, failRead=false) {
  let time=Date.now(), local:string|null=null;
  const sent:ProgressSample[]=[], locals:PlaybackProgress[]=[], notices:string[]=[];
  const writer=new ProgressWriter(async sample=>{sent.push(sample);},()=>{});
  const progress=new PlayerProgress({source,target,authenticated,restart:false,read:async()=>{if(failRead)throw new Error();return saved;},writer,localRead:()=>local,localWrite:sample=>{locals.push(sample);local=JSON.stringify(sample);},notice:text=>notices.push(text),now:()=>time});
  const media={currentTime:0,duration:120,paused:true,pause(){this.paused=true;}};
  return {progress,media,writer,sent,locals,notices,advance:(n:number)=>{time+=n;},seed:(s:PlaybackProgress)=>{local=JSON.stringify(s);}};
}
test("player loads without writing; active playback throttles, pause flushes, cleanup preserves latest",async()=>{
  const f=fixture(true,{positionSeconds:30,durationSeconds:120,completed:false});
  await f.progress.restore(f.media);assert.equal(f.media.currentTime,30);
  f.progress.sample(f.media,true);f.progress.stop();await f.writer.idle();assert.equal(f.sent.length,0);
  const g=fixture();await g.progress.restore(g.media);g.media.paused=false;g.progress.play(g.media);
  g.media.currentTime=10;g.advance(SAVE_INTERVAL-1);g.progress.sample(g.media);assert.equal(g.sent.length,0);
  g.advance(1);g.media.currentTime=20;g.progress.sample(g.media);await g.writer.idle();assert.equal(g.sent.length,1);
  g.media.paused=true;g.media.currentTime=25;g.progress.sample(g.media,true);await g.writer.idle();assert.equal(g.sent.at(-1)?.positionSeconds,25);
  g.media.paused=false;g.media.currentTime=26;g.progress.sample(g.media);g.progress.stop();await g.writer.idle();assert.equal(g.sent.at(-1)?.positionSeconds,26);
});
test("completion, restart and guest local progress retain correct identity without guest API writes",async()=>{
  const f=fixture();await f.progress.restore(f.media);f.media.paused=false;f.progress.play(f.media);f.media.currentTime=120;f.progress.sample(f.media,true,true);await f.writer.idle();
  assert.equal(f.sent.at(-1)?.ended,true);assert.equal(parseProgressInput(f.sent.at(-1)).completed,true);
  f.progress.restart(f.media);await f.writer.idle();assert.equal(f.media.currentTime,0);assert.equal(parseProgressInput(f.sent.at(-1)).completed,false);
  const guest=fixture(false);await guest.progress.restore(guest.media);guest.media.paused=false;guest.progress.play(guest.media);guest.media.currentTime=40;guest.progress.sample(guest.media,true);guest.progress.stop();await guest.writer.idle();assert.equal(guest.sent.length,0);assert.equal(guest.locals.at(-1)?.position,40);
  const again=fixture(false);again.seed(guest.locals.at(-1)!);await again.progress.restore(again.media);assert.equal(again.media.currentTime,40);
});
test("failed server restoration cannot overwrite unknown saved progress",async()=>{
  const f=fixture(true,null,true);await f.progress.restore(f.media);f.media.paused=false;f.progress.play(f.media);f.media.currentTime=5;f.progress.sample(f.media,true);f.progress.stop();await f.writer.idle();assert.equal(f.sent.length,0);assert.match(f.notices.at(-1)!,/could not load/);
});
test("writer serializes requests, coalesces samples, and ignores duplicate cleanup flushes",async()=>{
  const sent:number[]=[];let release:()=>void=()=>{};
  const writer=new ProgressWriter(async sample=>{sent.push(sample.observedAt);if(sent.length===1)await new Promise<void>(resolve=>{release=resolve;});},()=>{});
  const sample={...target,positionSeconds:1,durationSeconds:120};
  writer.enqueue({...sample,observedAt:1});writer.enqueue({...sample,observedAt:2});writer.enqueue({...sample,observedAt:3});writer.enqueue({...sample,observedAt:3});assert.deepEqual(sent,[1]);release();await writer.idle();assert.deepEqual(sent,[1,3]);
});
test("missing TMDB metadata retains non-playable history without invented resume links",async()=>{
  const fetchBefore=globalThis.fetch, token=process.env.TMDB_READ_ACCESS_TOKEN;
  process.env.TMDB_READ_ACCESS_TOKEN="test-only";globalThis.fetch=async()=>new Response("{}",{status:404});
  try {
    const row={id:"record",userId:"private",contentKey:"tv:42:1:2",mediaType:"tv" as const,tmdbId:42,demoId:null,seasonNumber:1,episodeNumber:2,positionSeconds:30,durationSeconds:120,completed:false,observedAt:new Date(),lastWatchedAt:new Date(),createdAt:new Date(),updatedAt:new Date()};
    const item=await presentProgress(row);assert.equal(item.title,"TV series #42");assert.equal(item.watchHref,null);assert.equal(item.detailsHref,"/tv/42");assert.equal("userId" in item,false);assert.equal(progressSource({mediaType:"movie",tmdbId:42}),null);
  } finally {globalThis.fetch=fetchBefore;if(token===undefined)delete process.env.TMDB_READ_ACCESS_TOKEN;else process.env.TMDB_READ_ACCESS_TOKEN=token;}
});

test("writer recovers after synchronous transport failure",async()=>{
  let attempts=0, failures=0;
  const writer=new ProgressWriter(()=>{attempts++;if(attempts===1)throw new Error();return Promise.resolve();},()=>{failures++;});
  const sample={...target,positionSeconds:1,durationSeconds:120};
  writer.enqueue({...sample,observedAt:1});await writer.idle();
  writer.enqueue({...sample,observedAt:2});await writer.idle();
  assert.equal(attempts,2);assert.equal(failures,1);
});
