/** Bounded, source-attributed leadership enrichment. No names are inferred from reputation. */
import { pageLinks, readableText, extractMetrics, type Metric } from './discovery';
import { normalizeSocialLink, SOCIAL_PLATFORMS } from '../shared/social-input';
import { searchLinks, checkPodcast, type PodcastEvidence } from './supplemental';
type Page = {url:string;html:string};
type Fetcher = (url:string,timeout:number)=>Promise<{ok:boolean;body:string;status:number;finalUrl:string}>;
export type FounderProfile = {url:string;platform:string;sourceUrl:string;metrics:Metric[]};
export type FounderPerson = {name:string;role:string;sourceUrl:string;excerpt:string;profiles:FounderProfile[];podcasts:(PodcastEvidence & {sourceUrl:string})[]};
export type FounderFootprint = {version:'founder-v1';people:FounderPerson[];status:'found'|'not-verified'|'unavailable';requests:number;limited:boolean;note:string};
const role = /\b(?:(?:co[- ]?)?founder|owner|chief executive(?: officer)?|CEO)\b/i;
const past = /\b(former|previous|ex[- ]|late|departed)\b/i;
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const nameValid=(s:string)=>s.length<=80&&s.trim().split(/\s+/).length>=2&&s.trim().split(/\s+/).length<=6&&!/company|our |team|about|meet |leadership|founder|executive|welcome|podcast|privacy|terms/i.test(s)&&/^[\p{L}][\p{L}\s.'’\-]+$/u.test(s);
const publicUrl=(s:string,base:string)=>{try{const u=new URL(s,base);if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.port)return null;u.hash='';return u.href;}catch{return null;}};
export function profileLink(raw:string):{url:string;platform:string}|null {
 for(const p of SOCIAL_PLATFORMS){const url=normalizeSocialLink(p,raw);if(url)return {url,platform:p};}
 try{const u=new URL(raw),h=u.hostname.replace(/^www\./,'').toLowerCase(),p=u.pathname.replace(/\/$/,'');
 if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.port)return null;
 if(h==='linkedin.com'&&/^\/in\/[\w%-]+$/i.test(p))return {url:`https://www.linkedin.com${p}`,platform:'linkedin'};
 if(['x.com','twitter.com','facebook.com'].includes(h)&&/^\/[\w.\-]+$/.test(p)&&!/^\/(?:share|sharer|intent|home|login|privacy|dialog|search)$/i.test(p))return {url:`https://${h}${p}`,platform:h==='facebook.com'?'facebook':'x'};
 }catch{}return null;
}
export type Candidate={name:string;role:string;sourceUrl:string;excerpt:string;links:string[];explicitLinks:string[]};
export function extractLeaders(page:Page):Candidate[]{
 const result:Candidate[]=[];
 const add=(name:string,r:string,excerpt:string,links:string[],explicit=false)=>{name=name.trim();if(nameValid(name)&&role.test(r)&&!past.test(r))result.push({name,role:r.trim().slice(0,120),sourceUrl:page.url,excerpt:excerpt.slice(0,400),links,explicitLinks:explicit?links:[]});};
 const clean=page.html.replace(/<(?:nav|header|footer)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer)>/gi,'');
 for(const block of clean.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{const doc=JSON.parse(block[1]);const visit=(v:any,depth=0)=>{if(!v||typeof v!=='object'||depth>12)return;
   const types=Array.isArray(v['@type'])?v['@type']:[v['@type']];
   if(types.some((t:string)=>/Organization|Corporation|LocalBusiness/.test(t||''))){
    // Only organization nodes referring to this website can assert its founder.
    const own=(v.url||v['@id'])?publicUrl(v.url||v['@id'],page.url):null;if(own&&new URL(own).hostname.replace(/^www\./,'')===new URL(page.url).hostname.replace(/^www\./,'')){
     for(const f of [v.founder,v.founders].flat().filter(Boolean)){if(typeof f==='object'&&typeof f.name==='string')add(f.name,'Founder',`${f.name}: founder in company structured data`,[f.url,...[f.sameAs].flat()].filter((x):x is string=>typeof x==='string').map(x=>publicUrl(x,page.url)).filter((x):x is string=>!!x),true);}
    }
   }
   for(const value of Object.values(v))visit(value,depth+1);
  };visit(doc);}catch{}
 }
 // A role next to a person's heading on an official bio/card, never a site-wide keyword.
 const officialBioPath=new URL(page.url).pathname;
 if(/\/(?:blog|news|articles?|case-stud|work|clients?|customers?)\b/i.test(officialBioPath))return result;
 const visible=clean.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const headings=[...visible.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
 headings.forEach((h,i)=>{const name=readableText(h[2]);if(!nameValid(name))return;
  const next=headings[i+1];const nextIsRole=!!next&&role.test(readableText(next[2]))&&next.index!-h.index!<500;
  const section=visible.slice(h.index!,Math.min(headings[i+(nextIsRole?2:1)]?.index??visible.length,h.index!+5500));
  const intro=readableText(section).slice(name.length, name.length+200);const r=intro.match(/^[:\s,|–—-]*(?:(?:is|serves as) (?:the |a )?)?((?:(?:chairman|chairperson|president) (?:and |& ))?(?:co[- ]?)?founder|owner|chief executive(?: officer)?|CEO|chairman and CEO|chairman & CEO)\b/i);if(!r||past.test(intro))return;
  const links=pageLinks(section,page.url);add(name,r[0],readableText(section).slice(0,400),links);
 });
 const unique=new Map<string,Candidate>();for(const c of result){const key=norm(c.name);const prior=unique.get(key);if(prior){prior.links=[...new Set([...prior.links,...c.links])];prior.explicitLinks=[...new Set([...prior.explicitLinks,...c.explicitLinks])];}else unique.set(key,c);}return [...unique.values()];
}
export async function discoverFounderFootprint(base:string,pages:Page[],fetchPage:Fetcher):Promise<FounderFootprint>{
 const start=Date.now();let requests=0,limited=false;
 const read:Fetcher=async(url,ms)=>{if(requests>=16||Date.now()-start>30000){limited=true;return {ok:false,body:'',status:0,finalUrl:url};}requests++;return fetchPage(url,Math.min(ms,Math.max(1,30000-(Date.now()-start))));};
 const companyHost=new URL(base).hostname.replace(/^www\./,'');
 const candidates=new Map<string,Candidate>();
 const inspected=[...pages];const seenPages=new Set(pages.map(p=>p.url.replace(/\/$/,'')));
 const leadershipPages=[...new Set(pages.flatMap(p=>pageLinks(p.html,p.url)))].filter(u=>{try{const x=new URL(u);return x.hostname.replace(/^www\./,'')===companyHost&&!x.search&&/\/(?:about|about-us|team|leadership|people|founders?)(?:\/|$)/i.test(x.pathname)&&!seenPages.has(u.replace(/\/$/,''));}catch{return false;}}).slice(0,3);
 for(const url of leadershipPages){const r=await read(url,3500);if(r.ok&&new URL(r.finalUrl).hostname.replace(/^www\./,'')===companyHost)inspected.push({url:r.finalUrl,html:r.body});}
 for(const page of inspected)for(const c of extractLeaders(page)){const k=norm(c.name);const old=candidates.get(k);if(old){old.links=[...new Set([...old.links,...c.links])];old.explicitLinks=[...new Set([...old.explicitLinks,...c.explicitLinks])];}else if(candidates.size<3)candidates.set(k,c);else limited=true;}
 const people:FounderPerson[]=[];
 for(const c of candidates.values()){
  const corroboratedSites:{url:string;html:string}[]=[];
  const attributable=[...c.links.map(url=>({url,sourceUrl:c.sourceUrl,explicitPerson:c.explicitLinks.includes(url)}))];
  // Follow person-named official bios/personal sites, never arbitrary company-footer links.
  const tokens=c.name.toLowerCase().split(/\s+/).filter(t=>t.length>2);
  const bioLinks=[...new Set([...c.links,...pages.flatMap(p=>pageLinks(p.html,p.url)).filter(u=>{try{return new URL(u).hostname.replace(/^www\./,'')===companyHost&&tokens.every(t=>norm(new URL(u).pathname).includes(norm(t)));}catch{return false;}})])].filter(u=>!profileLink(u)&&!/[?]|\.(?:pdf|jpg|png|svg|zip)$/i.test(u)).filter(u=>tokens.every(t=>norm(u).includes(norm(t)))).slice(0,2);
  for(const url of bioLinks){const r=await read(url,4000);if(!r.ok)continue;const title=readableText([...r.body.matchAll(/<(?:title|h1)\b[^>]*>([\s\S]*?)<\/(?:title|h1)>/gi)].map(m=>m[1]).join(' '));
   if(!norm(title).includes(norm(c.name)))continue;
   const body=r.body.replace(/<(?:nav|footer)\b[^>]*>[\s\S]*?<\/(?:nav|footer)>/gi,'');
   // Only a Person.sameAs block for this exact name can supply alias handles.
   for(const block of body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const walk=(v:any,d=0)=>{if(!v||typeof v!=='object'||d>12)return;if(v['@type']==='Person'&&norm(v.name||'')===norm(c.name))for(const raw of [v.sameAs].flat())if(typeof raw==='string'){const u=publicUrl(raw,r.finalUrl);if(u)attributable.push({url:u,sourceUrl:r.finalUrl,explicitPerson:true});}for(const value of Object.values(v))walk(value,d+1);};walk(JSON.parse(block[1]));}catch{}}
   for(const u of pageLinks(body,r.finalUrl))if(tokens.every(t=>norm(u).includes(norm(t))))attributable.push({url:u,sourceUrl:r.finalUrl,explicitPerson:false});
  }
  const knownProfiles=attributable.filter(x=>x.explicitPerson||tokens.every(t=>norm(new URL(x.url).pathname).includes(norm(t)))).map(x=>profileLink(x.url)?.url).filter((u):u is string=>!!u);
  if(knownProfiles.length){
   const query=await read(`https://html.duckduckgo.com/html/?q=${encodeURIComponent('"'+c.name+'" official website')}`,4000);
   if(query.ok&&!/challenge-form|anomaly-modal|captcha/i.test(query.body)){
    for(const url of searchLinks(query.body).filter(u=>!profileLink(u)).slice(0,2)){
     const r=await read(url,4000);if(!r.ok)continue;
     const u=new URL(r.finalUrl);if(u.pathname!=='/'&&u.pathname!=='')continue;
     const title=readableText(r.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
     const links=pageLinks(r.body,r.finalUrl);
     if(!norm(title).includes(norm(c.name))||!links.some(link=>knownProfiles.includes(profileLink(link)?.url||'')))continue;
     corroboratedSites.push({url:r.finalUrl,html:r.body});
     for(const block of r.body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const walk=(v:any,d=0)=>{if(!v||typeof v!=='object'||d>12)return;if(v['@type']==='Person'&&norm(v.name||'')===norm(c.name))for(const raw of [v.sameAs].flat())if(typeof raw==='string'){const u=publicUrl(raw,r.finalUrl);if(u)attributable.push({url:u,sourceUrl:r.finalUrl,explicitPerson:true});}for(const value of Object.values(v))walk(value,d+1);};walk(JSON.parse(block[1]));}catch{}}

     const chrome=[...r.body.matchAll(/<(?:nav|header|footer)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer)>/gi)].map(m=>m[0]).join(' ');
     for(const link of pageLinks(chrome,r.finalUrl))if(profileLink(link))attributable.push({url:link,sourceUrl:r.finalUrl,explicitPerson:true});
    }
   }else limited=true;
  }
  const person:FounderPerson={name:c.name,role:c.role,sourceUrl:c.sourceUrl,excerpt:c.excerpt,profiles:[],podcasts:[]};
  const seen=new Set<string>();
  for(const item of attributable){const p=profileLink(item.url);if(!p||seen.has(p.url)||person.profiles.length>=6)continue;
   if(!item.explicitPerson&&!tokens.every(t=>norm(new URL(p.url).pathname).includes(norm(t))))continue;seen.add(p.url);
   // Reject generic links also present in company-wide navigation/footer.
   const companyChrome=pages.some(page=>[...page.html.matchAll(/<(?:nav|header|footer)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer)>/gi)].some(m=>pageLinks(m[0],page.url).some(u=>profileLink(u)?.url===p.url)));
   if(companyChrome)continue;
   const metrics:Metric[]=[];
   person.profiles.push({...p,sourceUrl:item.sourceUrl,metrics});
  }
  // A dedicated podcast hub linked in a corroborated personal site's navigation is
  // associated media evidence, never a claim that the company owns the show.
  for(const site of corroboratedSites){
   const chrome=[...site.html.matchAll(/<(?:nav|header|footer)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer)>/gi)].map(m=>m[0]).join(' ');
   const hubs=pageLinks(chrome,site.url).filter(link=>{const u=new URL(link);return u.hostname===new URL(site.url).hostname&&/^\/podcasts?\/?$/i.test(u.pathname)&&!u.search;}).slice(0,1);
   for(const hub of hubs){const ev=await checkPodcast(hub,[],read);if(ev.verified)person.podcasts.push({...ev,sourceUrl:site.url,note:'Podcast evidence found in a dedicated hub linked by the corroborated personal website; company ownership is not established.'});}
  }
  await Promise.all(person.profiles.filter(p=>SOCIAL_PLATFORMS.includes(p.platform as any)).map(async p=>{const r=await read(p.url,3500);if(r.ok&&profileLink(r.finalUrl)?.url===p.url)p.metrics=extractMetrics(p.platform as any,r.body,p.url);}));
  people.push(person);
 }
 return {version:'founder-v1',people,status:people.length?'found':'not-verified',requests,limited,note:'Roles are attributed to the company website, not independently verified ownership. Personal channels are associated leadership evidence, not company-owned accounts; audiences are not added together. Missing profiles or metrics are unknown, not absent.'};
}

/** Existing podcast rubric applied to corroborated leadership evidence, without stacking. */
export function leadershipPodcastPoints(show:PodcastEvidence,now=Date.now()):number {
 if(!show.verified)return 0;
 let points=0.9+(show.episodes>0?0.3:0);
 const age=show.latestEpisode?now-Date.parse(show.latestEpisode):null;
 if(age!==null&&age>=0&&age<=90*86400000)points+=0.3;
 if(age!==null&&age>365*86400000)points=Math.min(points,0.45);
 return Math.min(1.5,points);
}
