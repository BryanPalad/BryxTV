import { test } from "node:test";
import assert from "node:assert/strict";
import { defineRegistry, providers, validYouTubeEmbed, playbackFrameOrigins, providerAllowsURL, validArchiveEmbed } from "../src/features/playback/providers/registry";
import { resolvedOptions, approvedPolicy, type SourceRecord, developmentPreviewOption, previewAllowed } from "../src/features/playback/providers/policy";
import { progressIdentity, progressKey } from "../src/features/history/types";
import { legacyOptions } from "../src/features/playback/providers/resolver";
import config from "../next.config";
const row:SourceRecord={id:"source",contentKey:"movie:42",sourceUrl:"/playback/sample.mp4",displayLabel:"Test source",priority:100,enabled:true,authorizationVerified:true,authorizationEvidence:"Rights reviewed for automated fixture only",availabilityStatus:"AVAILABLE",verificationEvidence:"Manual playback fixture",lastCheckedAt:new Date(),provider:{slug:"local-mp4",type:"VIDEOJS_MP4",enabled:true}};
test("provider registry supports all three types and rejects duplicate registrations",()=>{
  assert.deepEqual([...new Set([...providers.values()].map(p=>p.type))].sort(),["EXTERNAL_EMBED","VIDEOJS_HLS","VIDEOJS_MP4"]);
  const provider=providers.get("local-mp4")!;assert.throws(()=>defineRegistry([provider,provider]));
  assert.equal(providers.get("youtube-privacy")!.progressTracking,"unsupported");
  assert.equal(providers.get("youtube-privacy")!.availabilityCheck,"manual");
  assert.throws(()=>defineRegistry([{...provider,slug:"wildcard",allowedHostnames:["*.example.test"]}]));
  assert.equal(providerAllowsURL({...providers.get("youtube-privacy")!,validateURL:()=>true},"https://evil.test/embed/abcdefghijk"),false);
});
test("embed allowlist rejects deceptive hosts, credentials, redirect queries, noncanonical paths and unsafe schemes",()=>{
  assert.equal(validYouTubeEmbed("https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"),true);
  for(const url of ["http://www.youtube-nocookie.com/embed/M7lc1UVf-VE","https://www.youtube-nocookie.com.evil.test/embed/M7lc1UVf-VE","https://evil.test/?www.youtube-nocookie.com","https://user@www.youtube-nocookie.com/embed/M7lc1UVf-VE","https://www.youtube-nocookie.com:444/embed/M7lc1UVf-VE","https://www.youtube-nocookie.com/redirect?url=https://evil.test","https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?redirect=evil","https://www.youtube-nocookie.com/embed/../embed/M7lc1UVf-VE","https://www.youtube-nocookie.com/embed/M7lc1UVf-VE#fragment","javascript:alert(1)","//www.youtube-nocookie.com/embed/M7lc1UVf-VE"]) assert.equal(validYouTubeEmbed(url),false,url);
});
test("source resolution excludes unapproved, disabled, unverified and unknown rows; priority and DTO secrecy hold",()=>{
  const target={mediaId:"tmdb:movie:42"};
  for(const patch of [{authorizationVerified:false},{authorizationEvidence:null},{enabled:false},{availabilityStatus:"UNKNOWN"},{availabilityStatus:"UNAVAILABLE"},{lastCheckedAt:null},{verificationEvidence:null},{sourceUrl:"https://evil.test/video.mp4"},{provider:{slug:"unknown",type:"VIDEOJS_MP4",enabled:true}},{provider:{...row.provider,enabled:false}},{provider:{...row.provider,type:"EXTERNAL_EMBED"}}])assert.equal(resolvedOptions([{...row,...patch}],target).length,0);
  assert.equal(approvedPolicy({...row,availabilityStatus:"UNKNOWN"})?.slug,"local-mp4");
  assert.equal(resolvedOptions([row],{mediaId:"tmdb:tv:42",season:1,episode:2}).length,0);
  const result=resolvedOptions([{...row,id:"second",priority:50},{...row,id:"first",priority:1}],target);
  assert.deepEqual(result.map(s=>s.id),["first","second"]);assert.equal(result[0]?.video?.mediaId,target.mediaId);
  assert.equal("authorizationEvidence" in result[0]!,false);assert.equal("providerId" in result[0]!,false);
  assert.deepEqual(resolvedOptions([{...row,sourceUrl:"https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",provider:{slug:"youtube-privacy",type:"EXTERNAL_EMBED",enabled:true}}],target),[]);
});
test("canonical identifiers separate movies and episodes; guests retain approved local demos",()=>{
  assert.equal(progressKey(progressIdentity.parse({mediaType:"movie",tmdbId:42})),"movie:42");
  assert.throws(()=>progressIdentity.parse({mediaType:"movie",tmdbId:42,seasonNumber:1}));assert.throws(()=>progressIdentity.parse({mediaType:"tv",tmdbId:42}));
  assert.equal(legacyOptions({mediaId:"demo:big-buck-bunny"})[0]?.type,"VIDEOJS_MP4");
  assert.equal(legacyOptions({mediaId:"demo:big-buck-bunny-hls"})[0]?.type,"VIDEOJS_HLS");
  assert.equal(legacyOptions({mediaId:"tmdb:movie:42"}).length,0);
});
test("CSP derives exact frame origins and retains existing authentication and media protections",async()=>{
  const headers=await config.headers!();const csp=headers[0]!.headers.find(header=>header.key==="Content-Security-Policy")!.value;
  assert.deepEqual(playbackFrameOrigins,["https://archive.org"]);
  assert.match(csp,/frame-src https:\/\/archive.org;/);assert.match(csp,/frame-ancestors 'none'/);assert.match(csp,/form-action 'self'/);assert.match(csp,/media-src 'self' blob:/);assert.doesNotMatch(csp,/frame-src[^;]*\*/);
});

test("Archive policy permits only the reviewed Valkaama embed and previews cannot become public approval",()=>{
  assert.equal(validArchiveEmbed("https://archive.org/embed/valkaama"),true);
  for(const url of ["http://archive.org/embed/valkaama","https://archive.org.evil.test/embed/valkaama","https://archive.org/embed/other","https://archive.org/embed/valkaama?autoplay=1","https://user@archive.org/embed/valkaama","https://archive.org/details/valkaama"])assert.equal(validArchiveEmbed(url),false);
  const pending={...row,provider:{slug:"internet-archive",type:"EXTERNAL_EMBED",enabled:true},sourceUrl:"https://archive.org/embed/valkaama",enabled:false,availabilityStatus:"UNKNOWN",lastCheckedAt:null,verificationEvidence:null};
  assert.equal(resolvedOptions([pending],{mediaId:"tmdb:movie:42"}).length,0);
  assert.equal(developmentPreviewOption(pending,{mediaId:"tmdb:movie:42"})?.preview,true);
  assert.equal(developmentPreviewOption(pending,{mediaId:"tmdb:movie:43"}),null);
  assert.equal(developmentPreviewOption({...pending,authorizationVerified:false},{mediaId:"tmdb:movie:42"}),null);
  assert.equal(previewAllowed("production","localhost:3001",true),false);
  assert.equal(previewAllowed("development","localhost.evil.test",true),false);
  assert.equal(previewAllowed("development","localhost:3001",false),false);
  assert.equal(previewAllowed("development","localhost:3001",true),true);
});
