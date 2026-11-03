/** Proposed integration seam: reuses pages already read, without changing scores.
 * Not imported by the production analyzer until the targeted integration is approved.
 */
import { discoverEvidence, type EvidenceFetch } from './evidence-discovery';
export async function collectEvidenceTrace(base:string, pages:{url:string;html:string}[], sitemapUrls:string[], safeFetch:EvidenceFetch) {
 const cached=new Map(pages.map(page=>[page.url.replace(/\/$/,''),page]));
 return discoverEvidence(base,async(url,timeoutMs)=>{
  const page=cached.get(url.replace(/\/$/,''));
  return page?{ok:true,status:200,body:page.html,finalUrl:page.url}:safeFetch(url,timeoutMs);
 },{sitemapUrls,maxRequests:24,maxDurationMs:24000});
}
