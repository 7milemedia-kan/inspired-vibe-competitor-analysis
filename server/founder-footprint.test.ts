import test from 'node:test';
import assert from 'node:assert/strict';
import {extractLeaders,discoverFounderFootprint,profileLink} from './founder-footprint';
const base='https://agency.example/';
const page=(html:string,url=base)=>({url,html});
test('extracts official structured founder and personal profiles, not arbitrary Person nodes',()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Organization',url:base,founder:{'@type':'Person',name:'Jane Smith',sameAs:['https://www.instagram.com/janesmith']}})+'</script>';
 assert.equal(extractLeaders(page(html))[0].name,'Jane Smith');
 assert.equal(extractLeaders(page('<script type="application/ld+json">{"@type":"Person","name":"Jane Smith","jobTitle":"Founder"}</script>')).length,0);
});
test('rejects foreign organization, unknown organization URL, former role and incidental mention',()=>{
 for(const data of [{'@type':'Organization',url:'https://other.example',founder:{name:'Jane Smith'}},{'@type':'Organization',founder:{name:'Jane Smith'}}])assert.equal(extractLeaders(page('<script type="application/ld+json">'+JSON.stringify(data)+'</script>')).length,0);
 assert.equal(extractLeaders(page('<h1>Jane Smith</h1><p>Former CEO</p>')).length,0);
 assert.equal(extractLeaders(page('<h1>Jane Smith</h1><p>Interview with a founder about business.</p>')).length,0);
 assert.equal(extractLeaders(page('<h2>Jane Smith</h2><p>Founder</p>','https://agency.example/blog/interview')).length,0);
});
test('isolates leadership headings from next person and footer',()=>{
 const people=extractLeaders(page('<h2>Jane Smith</h2><p>Co-founder</p><a href="https://instagram.com/janesmith">Instagram</a><h2>Other Person</h2><p>Designer</p><a href="https://instagram.com/otherperson">Instagram</a><footer><a href="https://instagram.com/company">Instagram</a></footer>'));
 assert.equal(people.length,1);assert.equal(people[0].links.length,1);
});
test('discovers distinct attributed social profiles and suppresses company-wide links',async()=>{
 const pages=[page('<h1>Jane Smith</h1><p>Founder</p><a href="https://www.instagram.com/janesmith">Personal</a><a href="https://x.com/company">Company</a><footer><a href="https://x.com/company">Company</a></footer>')];
 const result=await discoverFounderFootprint(base,pages,async(url)=>({ok:true,status:200,finalUrl:url,body:'<html>unknown metrics</html>'}));
 assert.equal(result.people[0].profiles.length,1);assert.equal(result.people[0].profiles[0].metrics.length,0);assert.equal(result.people[0].profiles[0].sourceUrl,base);
});
test('no named leader means unknown, not an invented founder',async()=>{
 const result=await discoverFounderFootprint(base,[page('<h1>Our company</h1><p>We are founders of innovation</p>')],async()=>{throw Error('unexpected fetch');});
 assert.equal(result.status,'not-verified');assert.equal(result.people.length,0);assert.equal(result.requests,0);
});
test('rejects unsafe social URLs and social share/post routes',()=>{
 for(const u of ['https://linkedin.com/company/a','https://x.com/share','javascript:alert(1)','https://user:pass@x.com/jane','https://instagram.com/p/abcd'])assert.equal(profileLink(u),null);
 assert.equal(profileLink('https://linkedin.com/in/jane-smith')?.platform,'linkedin');
});
test('does not assign interview guests or favorite podcasts from a named personal site',async()=>{
 const result=await discoverFounderFootprint(base,[page('<h1>Jane Smith</h1><p>Founder</p><a href="https://janesmith.example">Bio</a>')],async(url)=>({ok:true,status:200,finalUrl:url,body:'<title>Jane Smith</title><h1>Jane Smith</h1><h2>Interview guests</h2><a href="https://www.instagram.com/otherperson">Guest social</a><a href="https://other.example/podcast">My favorite podcast</a>'}));
 assert.equal(result.people[0].profiles.length,0);assert.equal(result.people[0].podcasts.length,0);
});
test('adjacent leadership profile is not credited to the preceding person',async()=>{
 const result=await discoverFounderFootprint(base,[page('<h3>Gary Vaynerchuk</h3><p>CEO</p><a href="https://linkedin.com/in/garyvaynerchuk">LinkedIn</a><a href="https://linkedin.com/in/johnvterrana">LinkedIn</a><h5>John Terrana</h5><p>Media</p>')],async(url)=>({ok:false,status:403,finalUrl:url,body:''}));
 assert.equal(result.people[0].profiles.length,1);assert.ok(result.people[0].profiles[0].url.includes('garyvaynerchuk'));
});
test('search candidates require known-profile corroboration and only site chrome supplies alias profiles',async()=>{
 const pages=[page('<h1>Jane Smith</h1><p>Founder</p><a href="https://linkedin.com/in/janesmith">LinkedIn</a>')];
 const result=await discoverFounderFootprint(base,pages,async(url)=>{
 let body='';
 if(url.includes('duckduckgo'))body='<a class="result__a" href="https://personal.example/">Personal</a><a class="result__a" href="https://imposter.example/">Other</a>';
 if(url==='https://personal.example/')body='<title>Jane Smith</title><header><a href="https://linkedin.com/in/janesmith">LinkedIn</a><a href="https://instagram.com/jsalias">Instagram</a><a href="/podcast/">Podcast</a></header><h2>Guests</h2><a href="https://instagram.com/guest">Guest</a>';
 if(url==='https://imposter.example/')body='<title>Jane Smith</title><header><a href="https://instagram.com/fake">Fake</a></header>';
 if(url==='https://personal.example/podcast/')body='<h1>Our podcast</h1><p>Listen to an episode</p>';
 return {ok:true,status:200,finalUrl:url,body};
 });
 assert.ok(result.people[0].profiles.some(p=>p.url.includes('jsalias')));
 assert.ok(!result.people[0].profiles.some(p=>/guest|fake/.test(p.url)));
 assert.equal(result.people[0].podcasts.length,1);
 assert.equal(result.people[0].podcasts[0].sourceUrl,'https://personal.example/');
});
