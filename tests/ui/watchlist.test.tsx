import { test, after } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost:3001"});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true}});
const originalFetch=globalThis.fetch;
let signedIn=true,fail=false;
let resolveMutation:(()=>void)|undefined;
const saved=new Set<string>();
globalThis.fetch=async(input,init)=>{
  const path=new URL(String(input),"http://localhost:3001").pathname;
  if(path==="/api/auth/get-session")return Response.json(signedIn?{session:{id:"test-session",userId:"test-user",expiresAt:new Date(Date.now()+3600000).toISOString()},user:{id:"test-user",name:"Test User",email:"user@example.invalid",emailVerified:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}:null);
  assert.equal(path,"/api/watchlist");
  if(!init?.method || init.method==="GET")return Response.json({items:[...saved].map(key=>({mediaType:key.split(":")[0],tmdbId:Number(key.split(":")[1])}))});
  await new Promise<void>(resolve=>{resolveMutation=resolve;});
  if(fail)return Response.json({error:"unavailable"},{status:503});
  const item=JSON.parse(String(init.body)),key=`${item.mediaType}:${item.tmdbId}`;
  if(init.method==="POST")saved.add(key);else saved.delete(key);
  return Response.json({item,saved:init.method==="POST"});
};
after(()=>{globalThis.fetch=originalFetch;dom.window.close();});
const {render,fireEvent,waitFor,act}=await import("@testing-library/react");
const {WatchlistProvider,useWatchlist}=await import("../../src/features/watchlist/components/watchlist-provider");
const {WatchlistButton}=await import("../../src/features/watchlist/components/watchlist-button");
const {authClient}=await import("../../src/lib/auth/client");
const {AppRouterContext}=await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
function ReadyProbe() {
  const state=useWatchlist();
  return <span data-testid="watchlist-ready">{String(state.authenticated && state.ready)}</span>;
}
test("buttons synchronize optimistically, disable duplicates, rollback failure, and disappear for guests",async()=>{
  const navigations:string[]=[];
  const router={back(){},forward(){},refresh(){},replace(){},prefetch(){},push(href:string){navigations.push(href);},bfcacheId:"test"};
  const view=render(<AppRouterContext.Provider value={router}><WatchlistProvider>
    <ReadyProbe />
    <WatchlistButton tmdbId={550} mediaType="movie" title="First copy" />
    <WatchlistButton tmdbId={550} mediaType="movie" title="Second copy" />
    <WatchlistButton tmdbId={1399} mediaType="tv" title="TV detail" />
  </WatchlistProvider></AppRouterContext.Provider>);
  assert.equal(view.queryAllByRole("button",{name:/My List:/}).length,0);
  await waitFor(()=>assert.equal(view.getByTestId("watchlist-ready").textContent,"true"));
  assert.ok(view.getByRole("button",{name:"Add to My List: TV detail"}));
  const first=await view.findByRole("button",{name:"Add to My List: First copy"});
  assert.equal((first as HTMLButtonElement).disabled,false);
  fireEvent.click(first);
  await waitFor(()=>assert.equal(view.getByRole("button",{name:"Remove from My List: Second copy"}).getAttribute("aria-pressed"),"true"));
  assert.equal((first as HTMLButtonElement).disabled,true);
  await waitFor(()=>assert.ok(resolveMutation));
  await act(async()=>{resolveMutation!();});resolveMutation=undefined;
  await waitFor(()=>assert.match(view.getByRole("status").textContent!,/Added/));
  fail=true;
  fireEvent.click(view.getByRole("button",{name:"Remove from My List: First copy"}));
  assert.equal(view.getByRole("button",{name:"Add to My List: Second copy"}).getAttribute("aria-pressed"),"false");
  await waitFor(()=>assert.ok(resolveMutation));
  await act(async()=>{resolveMutation!();});
  await waitFor(()=>assert.equal(view.getByRole("button",{name:"Remove from My List: First copy"}).getAttribute("aria-pressed"),"true"));
  assert.match(view.getByRole("alert").textContent!,/Unable to update/);
  signedIn=false;
  await act(async()=>{authClient.$store.notify("$sessionSignal");});
  await waitFor(()=>assert.equal(view.queryAllByRole("button",{name:/My List:/}).length,0));
  assert.deepEqual(navigations,[]);
  view.unmount();
});
