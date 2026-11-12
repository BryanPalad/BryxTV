import {test,after} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost:3001"});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true},sessionStorage:{value:dom.window.sessionStorage,configurable:true}});
after(()=>dom.window.close());
const {render,fireEvent,waitFor}=await import("@testing-library/react");
const {SourceSelector}=await import("../../src/features/playback/components/source-selector");
const {EmbeddedPlayer}=await import("../../src/features/playback/components/embedded-player");
import type {PlaybackOption} from "../../src/features/playback/providers/types";
const { TrailerPlayer } = await import("../../src/features/catalog/components/trailer-player");
// Test-only in-memory provider. No application registry, remote request or source approval changes.
const { providers } = await import("../../src/features/playback/providers/registry");
import type { ProviderDefinition } from "../../src/features/playback/providers/registry";
(providers as Map<string, ProviderDefinition>).set("fixture", {slug:"fixture", name:"Fixture", type:"EXTERNAL_EMBED", enabled:true, allowedHostnames:["player.example.invalid"], fullscreen:true, progressTracking:"unsupported", availabilityCheck:"manual", validateURL: url => /^https:\/\/player\.example\.invalid\/embed\/[a-z0-9]+$/.test(url)});
after(() => (providers as Map<string, ProviderDefinition>).delete("fixture"));
// Synthetic iframe fixtures: URL validation only, never fetched or claimed licensed/playable.
const first:PlaybackOption={id:"one",provider:"Fixture",label:"Fixture one",type:"EXTERNAL_EMBED",sourceUrl:"https://player.example.invalid/embed/one",progressTracking:"unsupported",fullscreen:true,video:null};
const second={...first,id:"two",label:"Fixture two",sourceUrl:"https://player.example.invalid/embed/two"};
test("source selection switches approved frames, persists per target, and explains unsupported resume",async()=>{
  const view=render(<SourceSelector sources={[first,second]} targetKey="movie:42" />);
  assert.equal(view.container.querySelector("iframe")!.getAttribute("src"),first.sourceUrl);
  fireEvent.change(view.getByRole("combobox",{name:"Playback source"}),{target:{value:"two"}});
  await waitFor(()=>assert.equal(view.container.querySelector("iframe")!.getAttribute("src"),second.sourceUrl));
  assert.equal(sessionStorage.getItem("bryxtv:source:movie:42"),"two");
  assert.match(view.getByText(/Exact resume and viewing-progress tracking/).textContent!,/preserved/);
  const frame=view.container.querySelector("iframe")!;assert.equal(frame.getAttribute("sandbox"),"allow-scripts allow-same-origin allow-presentation");assert.equal(frame.getAttribute("referrerpolicy"),"strict-origin-when-cross-origin");
  const originalFetch=globalThis.fetch;let progressWrites=0;
  globalThis.fetch=async()=>{progressWrites++;return Response.json({});};
  try {
    dom.window.dispatchEvent(new dom.window.MessageEvent("message",{origin:"https://evil.test",source:frame.contentWindow,data:{event:"timeupdate",positionSeconds:0,durationSeconds:120}}));
    assert.equal(progressWrites,0);
  } finally {globalThis.fetch=originalFetch;}
  fireEvent.load(frame);assert.equal(view.queryByText(/Loading embedded player/),null);
  fireEvent.click(view.getByText("Playback options"));
  fireEvent.click(view.getByRole("button",{name:"Retry player"}));assert.notEqual(view.container.querySelector("iframe"),frame);
  view.unmount();const again=render(<SourceSelector sources={[first,second]} targetKey="movie:42" />);assert.equal(again.container.querySelector("iframe")!.getAttribute("src"),second.sourceUrl);again.unmount();
  const preferred=render(<SourceSelector sources={[first,second]} targetKey="movie:42" preferredId="one" />);assert.equal(preferred.container.querySelector("iframe")!.getAttribute("src"),first.sourceUrl);preferred.unmount();
});
test("invalid iframe source is blocked and absence of sources has an unavailable state",()=>{
  const invalid=render(<EmbeddedPlayer source={{...first,sourceUrl:"https://evil.test/embed/abcdefghijk"}} />);assert.equal(invalid.container.querySelector("iframe"),null);assert.ok(invalid.getByRole("alert"));invalid.unmount();
  const empty=render(<SourceSelector sources={[]} targetKey="empty" />);assert.ok(empty.getByText("Video Not Available"));empty.unmount();
});
test("development preview stays visibly unverified and fullscreen targets its responsive container",async()=>{
  const view=render(<SourceSelector sources={[{...first,preview:true}]} targetKey="preview:42" />);
  assert.ok(view.getByText(/Development preview: playback is unverified/));
  assert.equal(view.queryByText(/Manually verified/),null);
  const wrapper=view.container.querySelector<HTMLDivElement>(".embed-frame")!;
  let requests=0;
  wrapper.requestFullscreen=async()=>{requests++;};
  fireEvent.click(view.getByText("Playback options"));
  fireEvent.click(view.getByRole("button",{name:/^Fullscreen$/}));
  await waitFor(()=>assert.equal(requests,1));
  assert.ok(wrapper.querySelector("iframe"));
  view.unmount();
});
test("fullscreen follows browser events, exits without replacing the iframe, and reports unsupported/denied requests separately",async()=>{
  const view=render(<EmbeddedPlayer source={first} />);
  const wrapper=view.container.querySelector<HTMLDivElement>(".embed-frame")!;
  const frame=wrapper.querySelector("iframe")!;
  fireEvent.load(frame);
  fireEvent.click(view.getByText("Playback options"));
  fireEvent.click(view.getByRole("button",{name:/^Fullscreen$/}));
  assert.ok(view.getByText(/Fullscreen is unavailable in this browser/));
  assert.equal(view.queryByRole("alert"),null);
  wrapper.requestFullscreen=async()=>{throw new Error("Denied");};
  fireEvent.click(view.getByRole("button",{name:/^Fullscreen$/}));
  await waitFor(()=>assert.ok(view.getByText(/Fullscreen could not open/)));
  assert.equal(view.queryByRole("alert"),null);
  let active:Element|null=null;
  Object.defineProperty(document,"fullscreenElement",{configurable:true,get:()=>active});
  const previousExit=document.exitFullscreen;
  document.exitFullscreen=async()=>{active=null;document.dispatchEvent(new dom.window.Event("fullscreenchange"));};
  wrapper.requestFullscreen=async()=>{active=wrapper;document.dispatchEvent(new dom.window.Event("fullscreenchange"));};
  try {
    fireEvent.click(view.getByRole("button",{name:/^Fullscreen$/}));
    await waitFor(()=>assert.ok(view.getByRole("button",{name:"Exit fullscreen"})));
    assert.equal(wrapper.querySelector("iframe"),frame);
    fireEvent.click(view.getByRole("button",{name:"Exit fullscreen"}));
    await waitFor(()=>assert.equal(view.queryByRole("button",{name:"Exit fullscreen"}),null));
    assert.equal(wrapper.querySelector("iframe"),frame);
    fireEvent.click(view.getByRole("button",{name:/^Fullscreen$/}));
    await waitFor(()=>assert.ok(view.getByRole("button",{name:"Exit fullscreen"})));
    active=null;
    fireEvent(document,new dom.window.Event("fullscreenchange"));
    await waitFor(()=>assert.equal(view.queryByRole("button",{name:"Exit fullscreen"}),null));
  } finally {
    view.unmount();
    Object.defineProperty(document,"fullscreenElement",{configurable:true,value:null});
    document.exitFullscreen=previousExit;
  }
});
test("Archive stays uncluttered, single sources hide the selector and preview details start collapsed",()=>{
  const archive:PlaybackOption={...first,id:"archive-fixture",provider:"Internet Archive",label:"A full accessible title",sourceUrl:"https://archive.org/embed/valkaama",preview:true};
  const view=render(<SourceSelector sources={[archive]} targetKey="preview:archive" />);
  assert.equal(view.queryByRole("combobox"),null);
  assert.equal(view.queryByRole("button",{name:/^Fullscreen$/}),null);
  const dev=view.container.querySelector<HTMLDetailsElement>(".playback-development")!;
  assert.equal(dev.open,false);
  assert.match(dev.textContent!,/UNKNOWN, disabled/);
  const options=view.container.querySelector<HTMLDetailsElement>(".playback-information")!;
  assert.equal(options.open,false);
  assert.ok(view.getByText("Internet Archive"));
  const frame=view.container.querySelector("iframe")!;
  fireEvent.load(frame);
  assert.equal(view.queryByText(/Player loaded/),null);
  fireEvent.click(view.getByText("Playback options"));
  fireEvent.click(view.getByRole("button",{name:"Retry player"}));
  assert.notEqual(view.container.querySelector("iframe"),frame);
  view.unmount();
});
test("multiple sources follow the video with short labels, accessible details and no public verification box",()=>{
  const view=render(<SourceSelector sources={[first,second]} targetKey="movie:compact" />);
  const frame=view.container.querySelector("iframe")!;
  const selector=view.getByRole("combobox",{name:"Playback source"});
  assert.ok(frame.compareDocumentPosition(selector)&dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(view.container.querySelector(".playback-development"),null);
  assert.equal(view.queryByText(/Manually verified/),null);
  assert.deepEqual(Array.from(view.container.querySelectorAll("option")).map(option=>option.textContent),["Fixture · 1","Fixture · 2"]);
  assert.equal(view.container.querySelector("option")!.title,"Fixture one");
  assert.match(view.getByText("Fixture: Fixture one").textContent!,/Fixture one/);
  view.unmount();
});

test("stale YouTube preferences, preview flags and aliased media types cannot initialize players", () => {
  const excluded: PlaybackOption = {...first, id:"historical", provider:"YouTube", sourceUrl:"https://www.youtube-nocookie.com/embed/t7KlZ38p39w", preview:true};
  sessionStorage.setItem("bryxtv:source:excluded", excluded.id);
  const view = render(<SourceSelector sources={[excluded, first]} targetKey="excluded" preferredId={excluded.id} />);
  assert.equal(view.container.querySelector("iframe")?.getAttribute("src"), first.sourceUrl);
  assert.equal(view.queryByText("YouTube"), null); view.unmount();
  for (const source of [excluded, {...excluded, provider:"BryxTV MP4", type:"VIDEOJS_MP4" as const}]) {
    const blocked = render(<SourceSelector sources={[source]} targetKey="blocked" />);
    assert.equal(blocked.container.querySelector("iframe,video"), null);
    assert.ok(blocked.getByText("Video Not Available")); blocked.unmount();
  }
  const direct = render(<EmbeddedPlayer source={excluded} />);
  assert.equal(direct.container.querySelector("iframe"), null); direct.unmount();
});

test("YouTube trailers cannot render a play control or iframe", () => {
  const view=render(<TrailerPlayer trailer={{key:"abcdefghijk",name:"Historical trailer"}} />);
  assert.equal(view.container.querySelector("button,iframe,video"),null);
  view.unmount();
});
