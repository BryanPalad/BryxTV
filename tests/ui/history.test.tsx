import { test, after } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost:3001"});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true},ResizeObserver:{value:class {observe(){} disconnect(){}},configurable:true}});
const originalFetch=globalThis.fetch;
let signedIn=false, progressRequests=0;
let savedPosition=30;
const writes:object[]=[];
globalThis.fetch=async(input,init)=>{
  const path=new URL(String(input),"http://localhost:3001").pathname;
  if(path==="/api/auth/get-session")return Response.json(signedIn?{session:{id:"history-session",userId:"history-user",expiresAt:new Date(Date.now()+3600000).toISOString()},user:{id:"history-user",name:"History User",email:"test@example.invalid",emailVerified:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}:null);
  if(path.startsWith("/api/viewing-progress/"))return Response.json({progress:{positionSeconds:savedPosition,durationSeconds:120,completed:false}});
  assert.equal(path,"/api/viewing-progress");progressRequests++;
  if(init?.method==="PUT"){const sample=JSON.parse(String(init.body));writes.push(sample);savedPosition=sample.positionSeconds;return Response.json({progress:sample});}
  return Response.json({items:[]});
};
after(()=>{globalThis.fetch=originalFetch;dom.window.close();});
const {render,waitFor,act,fireEvent}=await import("@testing-library/react");
const {ContinueWatching}=await import("../../src/features/history/components/continue-watching");
const {authClient}=await import("../../src/lib/auth/client");
test("guest homepage hides Continue Watching and never requests personal history; empty signed-in history also stays hidden",async()=>{
  const view=render(<ContinueWatching />);
  await waitFor(()=>assert.equal(authClient.$store.atoms.session!.get().isPending,false));
  assert.equal(progressRequests,0);assert.equal(view.queryByText("Continue Watching"),null);
  signedIn=true;await act(async()=>{authClient.$store.notify("$sessionSignal");});
  await waitFor(()=>assert.ok(progressRequests>0));assert.equal(view.queryByText("Continue Watching"),null);
  signedIn=false;await act(async()=>{authClient.$store.notify("$sessionSignal");});
  await waitFor(()=>assert.equal(authClient.$store.atoms.session!.get().data,null));
  assert.equal(view.queryByText("Continue Watching"),null);view.unmount();
});

const {usePlayerProgress}=await import("../../src/features/history/components/use-player-progress");
const source={id:"cached-video",mediaId:"demo:big-buck-bunny",sourceUrl:"/playback/sample.mp4",sourceType:"mp4" as const,title:"Sample",description:"Demo",authorized:true,attribution:{creator:"Test",provider:"Test",source:"https://example.invalid",license:"CC BY",licenseUrl:"https://example.invalid",changes:""}};
function CachedPlayer(){const {attach:mediaRef,onPlay,onPause,onTimeUpdate,notice}=usePlayerProgress(source,false);return <><video ref={mediaRef} onPlay={onPlay} onPause={onPause} onTimeUpdate={onTimeUpdate} /><p role="status">{notice}</p></>;}
test("cached media restores through its ref on remount, without initial writes, and pause saves to the account",async()=>{
  Object.defineProperty(dom.window.HTMLMediaElement.prototype,"duration",{configurable:true,get:()=>120});
  Object.defineProperty(dom.window.HTMLMediaElement.prototype,"paused",{configurable:true,get:()=>false});
  signedIn=true;await act(async()=>{authClient.$store.notify("$sessionSignal");});
  const view=render(<CachedPlayer />);
  await waitFor(()=>assert.equal(view.getByRole("status").textContent,"Resumed at 0:30."));
  const video=view.container.querySelector("video")!;assert.equal(video.currentTime,30);assert.equal(writes.length,0);
  fireEvent.play(video);video.currentTime=40;fireEvent.pause(video);
  await waitFor(()=>assert.equal(writes.length,1));assert.equal(savedPosition,40);
  view.unmount();
  const again=render(<CachedPlayer />);
  await waitFor(()=>assert.equal(again.getByRole("status").textContent,"Resumed at 0:40."));
  assert.equal(again.container.querySelector("video")!.currentTime,40);assert.equal(writes.length,1);again.unmount();
});
