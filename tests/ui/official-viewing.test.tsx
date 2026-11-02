import {test,after} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost:3001"});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true}});
after(()=>dom.window.close());
const {render}=await import("@testing-library/react");
const {OfficialViewing}=await import("../../src/features/playback/components/official-viewing");
const {officialSourceSchema}=await import("../../src/features/playback/providers/official-policy");
import manifest from "../../src/features/playback/data/official-sources.json";
const compilation=officialSourceSchema.parse(manifest.find(row=>row.format==="COMPILATION"));
test("provider-only compilation exposes a safe official external link, no internal play or private review evidence",()=>{
 const view=render(<OfficialViewing rows={[compilation]}/>);
 const link=view.getByRole("link",{name:/Watch on Ani-One/});
 assert.equal(link.getAttribute("href"),"https://www.youtube.com/watch?v=dBdEWgtknLM");
 assert.equal(link.getAttribute("target"),"_blank");assert.match(link.getAttribute("rel")!,/noopener/);
 assert.ok(view.getByText(/Season compilation · not separate episodes/));
 assert.ok(view.getByText(/Philippines availability has not been confirmed/));
 assert.equal(view.container.querySelector('a[href^="/watch"]'),null);
 assert.equal(view.container.textContent!.includes(compilation.evidence),false);
 view.unmount();
});
test("candidates, restrictions and disabled reviews cannot expose Play or provider-only actions",()=>{
 for(const patch of [{status:"UNKNOWN" as const},{region:"RESTRICTED_PH" as const},{enabled:false}]){
 const view=render(<OfficialViewing rows={[{...compilation,...patch}]}/>);
 assert.equal(view.queryByRole("link"),null);
 assert.equal(view.container.querySelector("iframe"),null);view.unmount();
 }
 const empty=render(<OfficialViewing rows={[]}/>);assert.ok(empty.getByText("No verified viewing source"));empty.unmount();
 const live=render(<OfficialViewing rows={[]} playable/>);assert.ok(live.getByText("Watch on BryxTV"));assert.equal(live.queryByRole("link"),null);live.unmount();
});

test("compact episode status avoids duplicate titles, language metadata and large review panels",()=>{
 const ready=officialSourceSchema.parse(manifest.find(row=>row.key==="muse-one-punch-man-s3e1"));
 const live=render(<OfficialViewing compact playable rows={[ready]}/>);
 assert.ok(live.getByText("Watch on BryxTV"));assert.equal(live.queryByText(ready.title),null);assert.equal(live.container.querySelector("section"),null);assert.equal(live.queryByRole("link"),null);live.unmount();
 const external=render(<OfficialViewing compact rows={[compilation]}/>);
 assert.equal(external.getByRole("link").getAttribute("href"),"https://www.youtube.com/watch?v=dBdEWgtknLM");assert.equal(external.queryByText(compilation.title),null);external.unmount();
 const unknown=render(<OfficialViewing compact rows={[{...ready,status:"UNKNOWN"}]}/>);
 assert.ok(unknown.getByText("Availability under review"));assert.equal(unknown.queryByRole("link"),null);unknown.unmount();
});
