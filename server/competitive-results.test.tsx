import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompetitiveResults, signalScore, type ComparisonResult } from '../client/src/components/competitive-results';
import type { Pillar } from './analyze';
const pillar = (earned = .5, status: Pillar['status'] = 'weak'): Pillar => ({key:'social', label:'Social Presence',earned,max:1.25,status,summary:'Company links to public social profiles.',consequence:'',evidence:['Website-linked profile found.']});
const result = (p: Pillar): ComparisonResult => ({companyName:'Example',url:'https://example.com/',domain:'example.com',pillars:[p],sources:[{url:'https://example.com/',kind:'website',status:'read'}],socialMetrics:[],confidenceNote:'Evidence is limited.',score:2} as unknown as ComparisonResult);
const render = (own: ComparisonResult | null, competitor: ComparisonResult) => renderToStaticMarkup(<CompetitiveResults own={own} competitor={competitor} ownUrl="https://own.example/" reviewUrl="https://inspiredvibe.com/contact-us/"/>);
test('signal score preserves existing weighted points and rejects unverified numbers', () => {
 assert.equal(signalScore(pillar(.5)), .5);
 assert.equal(signalScore(pillar(0,'unverified')), null);
 assert.equal(signalScore(undefined), null);
 assert.equal(signalScore({...pillar(),max:0}), null);
});
test('equal verified scores render weighted denominator, not an invented normalized score', () => {
 const html = render(result(pillar()), result(pillar()));
 assert.ok(html.includes('0.5 / 1.25'));
 assert.ok(html.includes('No higher score is established'));
 assert.ok(!html.includes('Score mapping pending'));
 assert.ok(!html.includes('Each area uses the same 1–10 scale'));
 assert.ok(html.includes('Interpretation video coming soon'));
 assert.ok(!html.includes('<video'));
});
test('missing own evidence is not scored and never borrowed from the competitor', () => {
 const html = render(null, result(pillar(.8)));
 assert.ok(html.includes('Your company could not be assessed'));
 assert.ok(html.includes('https://own.example/'));
 assert.ok(html.includes('Not scored'));
 assert.ok(html.includes('0.8 / 1.25'));
 const unverified = render(result(pillar(0,'unverified')), result(pillar(.8)));
 assert.ok(unverified.includes('Not enough accessible public information to score this signal.'));
 assert.ok(!unverified.includes('0 / 1.25'));
});
test('source links reject unsafe protocols and React escapes source observations', () => {
 const r = result({...pillar(),summary:'<script>alert(1)</script>'});
 r.sources = [{url:'javascript:alert(1)',kind:'website',status:'read'}, {url:'https://user:secret@example.com',kind:'website',status:'read'}, {url:'https://example.com/proof',kind:'website',status:'read'}];
 const html = render(r,r);
 assert.ok(!html.includes('href="javascript:'));
 assert.ok(!html.includes('user:secret'));
 assert.ok(!html.includes('<script>alert'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('https://example.com/proof'));
});

test('partial comparison never claims both companies were evaluated or a reliable paired interpretation', () => {
 const html = render(null, result(pillar(.8)));
 assert.ok(!html.includes('Your company and your selected competitor have been evaluated'));
 assert.ok(html.includes('a complete side-by-side comparison could not be made'));
 assert.ok(html.includes('Incomplete evidence prevents a reliable comparison of this signal.'));
});
test('higher-score findings use the correct company and never promote unverified scores', () => {
 const own = result({...pillar(.8), summary:'Unique own-company observed evidence.'});
 const competitor = result({...pillar(.4), summary:'Unique competitor observed evidence.'});
 const html = render(own,competitor);
 const ownCard = html.slice(html.indexOf('Where your company scores higher'), html.indexOf('Where your competitor scores higher'));
 const competitorCard = html.slice(html.indexOf('Where your competitor scores higher'), html.indexOf('What deserves a closer look'));
 assert.ok(ownCard.includes('Unique own-company observed evidence.'));
 assert.ok(!ownCard.includes('Unique competitor observed evidence.'));
 assert.ok(competitorCard.includes('No higher score is established'));
 const reverse = render(competitor,own);
 const reverseCard = reverse.slice(reverse.indexOf('Where your competitor scores higher'), reverse.indexOf('What deserves a closer look'));
 assert.ok(reverseCard.includes('Unique own-company observed evidence.'));
 const unavailable = render(result(pillar(0,'unverified')),result(pillar(0,'unverified')));
 assert.equal((unavailable.match(/No higher score is established/g) || []).length,2);
 assert.ok(!unavailable.includes('0 / 1.25'));
});
