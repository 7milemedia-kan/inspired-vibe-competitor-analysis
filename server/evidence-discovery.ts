/** Opt-in evidence collector. It never awards points or modifies the production scorer.
 * The caller must supply the existing SSRF-safe, redirect-validating read-only fetcher.
 * No browser bypass, credentials, external search subscription or live submission is used.
 */
import net from 'node:net';
import { createHash } from 'node:crypto';
import { pageLinks, readableText } from './discovery';
import { normalizeSocialLink, SOCIAL_PLATFORMS } from '../shared/social-input';

export type EvidenceFetch = (url: string, timeoutMs: number) => Promise<{ok:boolean; body:string; status:number; finalUrl:string}>;
export type RetrievalOutcome = 'read'|'http-error'|'fetch-error'|'insufficient-text'|'offsite-redirect'|'access-challenge';
export type EvidenceSource = {id:string; url:string; finalUrl:string; retrievedAt:string; outcome:RetrievalOutcome; httpStatus:number|null; textHash:string|null; discoveredFrom:string|null};
export type EvidenceObservation = {id:string; sourceId:string; kind:'page-topic'|'linked-profile'; value:string; excerpt:string; locator:string; attribution:'company-page'|'ownership-unverified'; status:'observed'; extractorVersion:'discovery-v1'};
export type EvidenceDiscoveryResult = {sources:EvidenceSource[]; observations:EvidenceObservation[]; profileCandidates:{url:string; platform:string; sourceIds:string[]; ownership:'unverified'}[]; coverage:{pagesRead:number; requests:number; queuedRemaining:number; complete:boolean; stoppedBy:'queue-exhausted'|'request-budget'|'time-budget'; meaning:string}};
const topic = /\b(work|campaigns?|clients?|customers?|case studies|case study|recognition|awards?|events?|press|news|newsroom|insights?|research|blog|articles?|resources?|leadership|founders?|team|about|podcasts?|episodes?|videos?|webinars?|stories|impact|publications?)\b/i;
const excluded = /(?:^|\/)(?:logout|signout|unsubscribe|delete|checkout|cart|submit|intake|contact|login|signin|signup|register|request|thank-you)(?:\/|$)|\.(?:pdf|png|jpe?g|svg|zip|mp4|woff2?)$/i;
const id = (value:string) => createHash('sha256').update(value).digest('hex').slice(0,24);
const decode = (s:string) => s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
function anchors(html:string, base:string) {
 const clean=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 return [...clean.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].flatMap(m=>{
  try { const u=new URL(decode(m[2]),base); return [{url:u.href,label:readableText(m[3]).slice(0,240)}]; } catch {return [];}
 });
}
export async function discoverEvidence(base:string, fetchPage:EvidenceFetch, options:{maxRequests?:number; maxDurationMs?:number; sitemapUrls?:string[]; now?:()=>number}={}):Promise<EvidenceDiscoveryResult> {
 const root=new URL(base); if(!/^https?:$/.test(root.protocol)||root.username||root.password||root.port||root.search) throw new Error('Use a plain public company URL without credentials, port or query.');
 const host=root.hostname.toLowerCase().replace(/^www\./,'');
 if(net.isIP(host.replace(/^\[|\]$/g,''))||!host.includes('.')||/\.(local|localhost|internal|arpa)$/.test(host)) throw new Error('A public company hostname is required; DNS and redirect validation remain mandatory in the fetch adapter.');
 const now=options.now??Date.now, start=now();
 const maxRequests=Math.max(1,Math.min(48,Math.floor(options.maxRequests??24))), duration=Math.max(1,Math.min(60000,options.maxDurationMs??30000));
 const canonical=(raw:string):string|null=>{try {const u=new URL(raw,root); if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.port||u.search||u.hostname.toLowerCase().replace(/^www\./,'')!==host||excluded.test(u.pathname)) return null;u.hash='';return u.href.replace(/\/$/,'');}catch{return null;}};
 const queue:{url:string;from:string|null}[]=[],seen=new Set<string>(),queued=new Set<string>();
 const offer=(raw:string,from:string|null,label='',force=false)=>{const u=canonical(raw);if(!u||seen.has(u)||queued.has(u))return; const path=new URL(u).pathname.replace(/[-_/]/g,' '); if(!force&&!topic.test(path)&&!topic.test(label))return;queue.push({url:u,from});queued.add(u);};
 offer(root.href,null,'',true);
 for(const url of (options.sitemapUrls??[]).slice(0,2500)) offer(url,null);
 const sources:EvidenceSource[]=[],observations:EvidenceObservation[]=[];
 const profiles=new Map<string,{url:string;platform:string;sourceIds:string[];ownership:'unverified'}>();
 let requests=0;
 while(queue.length&&requests<maxRequests&&now()-start<duration){
  queue.sort((a,b)=>Number(a.from===null)-Number(b.from===null));
  const item=queue.shift()!;queued.delete(item.url);seen.add(item.url);requests++;
  const sourceId=id(item.url);let body='',finalUrl=item.url,httpStatus:number|null=null,outcome:RetrievalOutcome='fetch-error';
  try {const response=await fetchPage(item.url,Math.min(6000,Math.max(1,duration-(now()-start))));httpStatus=response.status;finalUrl=response.finalUrl;body=response.body;
   outcome=!response.ok?'http-error':!canonical(finalUrl)?'offsite-redirect':/id=["'](?:challenge-form|cf-challenge)|class=["'][^"']*anomaly-modal|\/cdn-cgi\/challenge-platform/i.test(body)?'access-challenge':readableText(body).length<100?'insufficient-text':'read';
  }catch{/* A failed read is unknown; never an absent signal. */}
  // Never retain credentials or query fragments from a redirect destination.
  try { const publicUrl=new URL(finalUrl);publicUrl.username='';publicUrl.password='';publicUrl.search='';publicUrl.hash='';finalUrl=publicUrl.href;}catch{finalUrl=item.url;}
  const text=outcome==='read'?readableText(body):'';
  sources.push({id:sourceId,url:item.url,finalUrl,retrievedAt:new Date(now()).toISOString(),outcome,httpStatus,textHash:text?id(text):null,discoveredFrom:item.from});
  if(outcome!=='read')continue;
  // A topic excerpt establishes only that text appears on this company page, not the claim's truth.
  const contentText=readableText(body.replace(/<(nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,''));
  const hit=topic.exec(contentText);
  if(hit){const excerpt=contentText.slice(Math.max(0,hit.index-100),hit.index+260);observations.push({id:id(sourceId+':topic:'+excerpt),sourceId,kind:'page-topic',value:hit[0],excerpt,locator:'readable-page-text',attribution:'company-page',status:'observed',extractorVersion:'discovery-v1'});}
  const links=anchors(body,finalUrl);
  for(const link of links)offer(link.url,sourceId,link.label);
  for(const raw of pageLinks(body,finalUrl)){
   offer(raw,sourceId);
   for(const platform of SOCIAL_PLATFORMS){const url=normalizeSocialLink(platform,raw);if(!url)continue;
    const existing=profiles.get(url);if(existing){if(!existing.sourceIds.includes(sourceId))existing.sourceIds.push(sourceId);}else profiles.set(url,{url,platform,sourceIds:[sourceId],ownership:'unverified'});
    const label=links.find(l=>normalizeSocialLink(platform,l.url)===url)?.label;
    const excerpt=label?`Link label: ${label}`:'Profile URL occurs in a page link or structured URL field; ownership is not established.';
    const observationId=id(sourceId+':profile:'+url);if(!observations.some(x=>x.id===observationId))observations.push({id:observationId,sourceId,kind:'linked-profile',value:url,excerpt,locator:label?'anchor-text':'pageLinks',attribution:'ownership-unverified',status:'observed',extractorVersion:'discovery-v1'});
   }
  }
 }
 const stoppedBy=!queue.length?'queue-exhausted':requests>=maxRequests?'request-budget':'time-budget';
 return {sources,observations,profileCandidates:[...profiles.values()],coverage:{pagesRead:sources.filter(x=>x.outcome==='read').length,requests,queuedRemaining:queue.length,complete:!queue.length&&sources.every(x=>x.outcome==='read'),stoppedBy,meaning:'Completeness covers this discovered queue only, not the entire website or market; missing observations never establish absence.'}};
}
