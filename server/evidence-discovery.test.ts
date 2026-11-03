import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverEvidence} from './evidence-discovery';
const filler='<p>'+ 'Company-owned public information. '.repeat(8)+'</p>';
const fetcher=(pages:Record<string,string>,calls:string[])=>async(url:string)=>{calls.push(url);return {ok:url in pages,body:pages[url]??'',status:url in pages?200:404,finalUrl:url};};
test('discovers work, awards, events and meaningful navigation labels',async()=>{
 const calls:string[]=[];const pages={'https://brand.test':filler+'<a href="/work/">Work</a><a href="/events">Events</a><a href="/x">Our Awards</a>','https://brand.test/work':filler+'Awards and case studies','https://brand.test/events':filler,'https://brand.test/x':filler};
 const r=await discoverEvidence('https://brand.test',fetcher(pages,calls));assert.equal(r.coverage.pagesRead,4);assert.ok(calls.includes('https://brand.test/x'));assert.equal(r.coverage.complete,true);
});
test('deduplicates fragments and refuses query, credential, offsite and action links',async()=>{
 const calls:string[]=[];const r=await discoverEvidence('https://brand.test',fetcher({'https://brand.test':filler+['/work#awards','/work#clients','/work?do=delete','https://brand.test.evil.test/work','https://user:secret@brand.test/work','/logout','/contact'].map(x=>`<a href="${x}">Awards</a>`).join(''),'https://brand.test/work':filler},calls));assert.deepEqual(calls,['https://brand.test','https://brand.test/work']);assert.equal(r.coverage.requests,2);
});
test('records inaccessible sources as unknown, never absent or zero',async()=>{
 const calls:string[]=[];const r=await discoverEvidence('https://brand.test',fetcher({'https://brand.test':filler+'<a href="/awards">Awards</a>'},calls));assert.equal(r.sources[1].outcome,'http-error');assert.equal(r.sources[1].httpStatus,404);assert.equal(r.sources[1].textHash,null);assert.equal(r.coverage.complete,false);assert.ok(!JSON.stringify(r).includes('"absent"'));
});
test('client or founder profile link never becomes owned company evidence',async()=>{
 const calls:string[]=[];const r=await discoverEvidence('https://brand.test',fetcher({'https://brand.test':filler+'<a href="https://instagram.com/clientbrand">Our client</a><a href="https://youtube.com/@founder">Founder channel</a>'},calls));assert.equal(r.profileCandidates.length,2);assert.ok(r.profileCandidates.every(p=>p.ownership==='unverified'));assert.equal(calls.length,1);for(const o of r.observations){assert.ok(r.sources.some(s=>s.id===o.sourceId));assert.ok(o.excerpt);}
});
test('budget exhaustion discloses remaining discovery and prevents false completeness',async()=>{
 const calls:string[]=[];const r=await discoverEvidence('https://brand.test',fetcher({'https://brand.test':filler+'<a href="/work">Work</a>'},calls),{maxRequests:1});assert.equal(r.coverage.stoppedBy,'request-budget');assert.equal(r.coverage.queuedRemaining,1);assert.equal(r.coverage.complete,false);
});
test('offsite redirects and fetch exceptions do not supply company evidence',async()=>{
 const redirected=await discoverEvidence('https://brand.test',async()=>({ok:true,body:filler,status:200,finalUrl:'https://other.test/work'}));assert.equal(redirected.sources[0].outcome,'offsite-redirect');assert.equal(redirected.observations.length,0);
 const failed=await discoverEvidence('https://brand.test',async()=>{throw new Error('timeout');});assert.equal(failed.sources[0].outcome,'fetch-error');assert.equal(failed.coverage.complete,false);
});

test('access challenge is unavailable evidence and is not retried or bypassed',async()=>{
 let calls=0;const r=await discoverEvidence('https://brand.test',async url=>{calls++;return {ok:true,status:200,body:'<form id="challenge-form">'+filler+'</form>',finalUrl:url};});assert.equal(calls,1);assert.equal(r.sources[0].outcome,'access-challenge');assert.equal(r.observations.length,0);assert.equal(r.coverage.complete,false);
});
test('rejects local and IP targets before calling the fetch adapter',async()=>{
 let calls=0;for(const url of ['http://127.0.0.1','http://host.local','http://localhost','http://[::1]']) await assert.rejects(discoverEvidence(url,async()=>{calls++;throw new Error('must not fetch');}));assert.equal(calls,0);
});
test('records time budget separately without interpreting unvisited pages',async()=>{
 let time=0;const r=await discoverEvidence('https://brand.test',async url=>{time=11;return {ok:true,status:200,body:filler+'<a href="/work">Work</a>',finalUrl:url};},{maxDurationMs:10,now:()=>time});assert.equal(r.coverage.stoppedBy,'time-budget');assert.equal(r.coverage.queuedRemaining,1);assert.equal(r.coverage.complete,false);
});
test('structural regression fixture finds four pages where legacy pathname filter finds one',async()=>{
 const {discover}=await import('./discovery');
 const html=filler+'<a href="/work">Work</a><a href="/events">Events</a><a href="/x">Awards</a>';
 const pages={'https://brand.test':html,'https://brand.test/work':filler,'https://brand.test/events':filler,'https://brand.test/x':filler};
 const old=await discover('https://brand.test',[{url:'https://brand.test',html}],[],{},fetcher(pages,[]));
 const improved=await discoverEvidence('https://brand.test',fetcher(pages,[]));
 assert.equal(old.pages.length,1);assert.equal(improved.coverage.pagesRead,4);
});
test('integration adapter reuses previously read pages without network calls',async()=>{
 const {collectEvidenceTrace}=await import('./evidence-adapter');let calls=0;
 const r=await collectEvidenceTrace('https://brand.test',[{url:'https://brand.test/',html:filler}],[],async()=>{calls++;throw new Error('must use cache');});assert.equal(calls,0);assert.equal(r.coverage.pagesRead,1);
});
test('redirect query and credentials are not retained in trace metadata',async()=>{
 const r=await discoverEvidence('https://brand.test',async()=>({ok:true,status:200,body:filler,finalUrl:'https://user:secret@other.test/path?token=secret#secret'}));const text=JSON.stringify(r);assert.ok(!text.includes('secret'));assert.equal(r.sources[0].outcome,'offsite-redirect');
});
test('navigation discovery is considered before broad sitemap inventory',async()=>{
 const calls:string[]=[];await discoverEvidence('https://brand.test',fetcher({'https://brand.test':filler+'<a href="/work">Work</a>','https://brand.test/work':filler},calls),{maxRequests:2,sitemapUrls:['https://brand.test/blog/old-article']});assert.deepEqual(calls,['https://brand.test','https://brand.test/work']);
});
