import { test } from "node:test";
import assert from "node:assert/strict";
import { officialSourceSchema, officialManifestSchema, officialProviders, youtubeWatchId, videoId, viewingState, officialMatches, officialEmbedReady, officialWatchUrl } from "../src/features/playback/providers/official-policy";
import manifest from "../src/features/playback/data/official-sources.json";
const episode = officialSourceSchema.parse(manifest.find(row => row.key === "muse-one-punch-man-s3e1"));
test("reviewed provider directory and canonical YouTube URL/ID validation reject ambiguous or injected URLs",()=>{
 assert.equal(Object.keys(officialProviders).length,7);
 assert.equal(youtubeWatchId("https://www.youtube.com/watch?v=t7KlZ38p39w"),"t7KlZ38p39w");
 for(const url of ["http://www.youtube.com/watch?v=t7KlZ38p39w","https://www.youtube.com.evil.test/watch?v=t7KlZ38p39w","https://www.youtube.com/watch?v=t7KlZ38p39w&list=foo","https://evil.test/watch?v=t7KlZ38p39w","https://user@www.youtube.com/watch?v=t7KlZ38p39w","https://www.youtube.com/watch?v=t7KlZ38p39w#x"] )assert.equal(youtubeWatchId(url),null);
 for(const id of ["short","a/bcdefghijk","<script>123","abcdefghijk?"])assert.equal(videoId.safeParse(id).success,false);
});
test("episode mapping uses explicit season numbers and compilations never masquerade as separate episodes",()=>{
 assert.equal(officialMatches(episode,"tv",63926,3,1),true);
 assert.equal(officialMatches(episode,"tv",63926,1,25),false);
 const compilation=officialSourceSchema.parse(manifest.find(row=>row.format==="COMPILATION"));
 assert.equal(officialMatches(compilation,"tv",244625),true);
 for(let e=1;e<=12;e++)assert.equal(officialMatches(compilation,"tv",244625,1,e),false);
 assert.equal(officialSourceSchema.safeParse({...compilation,episode:1}).success,false);
 assert.equal(officialSourceSchema.safeParse({...episode,episode:null}).success,false);
 assert.equal(officialSourceSchema.safeParse({...episode,uploaderUrl:"https://www.youtube.com/@unofficial"}).success,false);
});
test("all four viewing states fail closed for candidates, disabled sources and PH restrictions",()=>{
 const provider={...episode,status:"WATCH_ON_PROVIDER" as const,embedding:"UNSUPPORTED" as const};
 assert.equal(viewingState(true,[]),"WATCH_ON_BRYXTV");
 assert.equal(viewingState(false,[provider]),"WATCH_ON_PROVIDER");
 assert.equal(viewingState(false,[{...provider,region:"RESTRICTED_PH"}]),"UNAVAILABLE");
 assert.equal(viewingState(false,[episode]),"UNKNOWN");
 assert.equal(viewingState(false,[]),"UNAVAILABLE");
 assert.equal(viewingState(false,[],true),"UNKNOWN");
 assert.equal(viewingState(false,[{...provider,enabled:false}]),"UNAVAILABLE");
 assert.equal(viewingState(false,[{...provider,uploaderVerified:false}]),"UNKNOWN");
 assert.equal(officialSourceSchema.safeParse({...provider,mappingVerified:false}).success,false);
});
test("internal YouTube approval requires identity, mapping, actual regional/embed checks and public access",()=>{
 const ready={...episode,embedding:"ALLOWED" as const,region:"AVAILABLE_PH" as const,access:"PUBLIC" as const};
 assert.equal(officialEmbedReady(ready),true);
 for(const patch of [{enabled:false},{uploaderVerified:false},{mappingVerified:false},{embedding:"UNKNOWN" as const},{embedding:"BLOCKED" as const},{region:"UNKNOWN" as const},{region:"RESTRICTED_PH" as const},{access:"MEMBERSHIP" as const},{access:"PAID" as const},{format:"COMPILATION" as const}])assert.equal(officialEmbedReady({...ready,...patch}),false);
 assert.equal(officialWatchUrl(episode),"https://www.youtube.com/watch?v=t7KlZ38p39w");
});
test("registered manifest contains only separately reviewed records and no accidental internal playback approvals",()=>{
 const rows=manifest.map(row=>officialSourceSchema.parse(row));
 assert.equal(new Set(rows.map(row=>row.key)).size,rows.length);
 assert.ok(rows.every(row=>row.uploaderVerified&&row.mappingVerified));
 assert.ok(rows.filter(officialEmbedReady).some(row=>row.key==="muse-one-punch-man-s3e1"));
 assert.ok(rows.filter(officialEmbedReady).every(row=>row.region==="AVAILABLE_PH"&&row.embedding==="ALLOWED"&&row.access==="PUBLIC"));
 assert.ok(rows.every(row=>row.tmdbId!==74890));
});

test("server review gate admits only the reviewed exact anime episode and excludes pending movies and compilations",async()=>{
 const {officialSources,officialEmbedAllowed}=await import("../src/features/playback/providers/official-sources.server");
 assert.equal(officialSources("tv",63926,3,1).length,1);
 assert.equal(officialSources("tv",244625,1,1).length,0);
 assert.equal(officialEmbedAllowed("https://www.youtube-nocookie.com/embed/t7KlZ38p39w","tv",63926,3,1),true);
 assert.equal(officialEmbedAllowed("https://www.youtube-nocookie.com/embed/vZ7EMIH0oHw","movie",640828),false);
 assert.equal(officialEmbedAllowed("https://www.youtube-nocookie.com/embed/t7KlZ38p39w","tv",63926,1,25),false);
});

test("one video cannot be duplicated across episode mappings or disguised as independent compilation episodes",()=>{
 assert.equal(officialManifestSchema.safeParse([episode,{...episode,key:"different-key",episode:2}]).success,false);
 assert.equal(officialManifestSchema.safeParse([episode,{...episode,key:"different-key",format:"COMPILATION",episode:null}]).success,false);
});
