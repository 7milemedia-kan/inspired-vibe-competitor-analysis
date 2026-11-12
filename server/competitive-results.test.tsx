import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompetitiveResults, signalScore, normalizedSignalScore, type ComparisonResult } from '../client/src/components/competitive-results';
import type { Pillar } from './analyze';
const pillar = (earned = .5, status: Pillar['status'] = 'weak'): Pillar => ({key:'social', label:'Social Presence',earned,max:1.25,status,summary:'Company links to public social profiles.',consequence:'',evidence:['Website-linked profile found.']});
const result = (p: Pillar): ComparisonResult => ({companyName:'Example',url:'https://example.com/',domain:'example.com',pillars:[p],sources:[{url:'https://example.com/',kind:'website',status:'read'}],socialMetrics:[],confidenceNote:'Evidence is limited.',score:2} as unknown as ComparisonResult);
const render = (own: ComparisonResult | null, competitor: ComparisonResult) => renderToStaticMarkup(<CompetitiveResults own={own} competitor={competitor} ownUrl="https://own.example/" reviewUrl="https://buildyourbusiness.inspiredvibe.com/m-ca-booking"/>);
test('signal score preserves existing weighted points and rejects unverified numbers', () => {
 assert.equal(signalScore(pillar(.5)), .5);
 assert.equal(signalScore(pillar(0,'unverified')), null);
 assert.equal(signalScore(undefined), null);
 assert.equal(signalScore({...pillar(),max:0}), null);
});
test('equal verified scores render normalized display without changing weighted scoring', () => {
 const html = render(result(pillar()), result(pillar()));
 assert.ok(html.includes('4 / 10'));
 assert.ok(html.includes('does not change the underlying criteria, weights or overall score'));
 assert.ok(!html.includes('0.5 / 1.25'));
 assert.ok(html.includes('No higher score is established'));
 assert.ok(!html.includes('Score mapping pending'));
 assert.ok(!html.includes('Each area uses the same 1–10 scale'));
 assert.ok(html.includes('https://player.vimeo.com/video/1246418242?h=446ae10bdc'));
 assert.ok(!html.includes('Interpretation video coming soon'));
 assert.ok(html.includes('aspect-video'));
 assert.equal((html.match(/href="https:\/\/buildyourbusiness.inspiredvibe.com\/m-ca-booking"/g)||[]).length,2);
 assert.ok(!html.includes('<video'));
});
test('missing own evidence is not scored and never borrowed from the competitor', () => {
 const html = render(null, result(pillar(.8)));
 assert.ok(html.includes('Your company could not be assessed'));
 assert.ok(html.includes('https://own.example/'));
 assert.ok(html.includes('Not scored'));
 assert.ok(html.includes('6.4 / 10'));
 const unverified = render(result(pillar(0,'unverified')), result(pillar(.8)));
 assert.ok(unverified.includes('Not enough accessible public information to score this signal.'));
 assert.ok(!unverified.includes('0 / 10'));
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
 const competitorCard = html.slice(html.indexOf('Where your competitor scores higher'), html.indexOf('What deserves a closer look', html.indexOf('Where your competitor scores higher')));
 assert.ok(ownCard.includes('Unique own-company observed evidence.'));
 assert.ok(!ownCard.includes('Unique competitor observed evidence.'));
 assert.ok(competitorCard.includes('No higher score is established'));
 const reverse = render(competitor,own);
 const reverseCard = reverse.slice(reverse.indexOf('Where your competitor scores higher'), reverse.indexOf('What deserves a closer look', reverse.indexOf('Where your competitor scores higher')));
 assert.ok(reverseCard.includes('Unique own-company observed evidence.'));
 const unavailable = render(result(pillar(0,'unverified')),result(pillar(0,'unverified')));
 assert.equal((unavailable.match(/No higher score is established/g) || []).length,2);
 assert.ok(!unavailable.includes('0 / 10'));
});

test('display normalization handles every existing signal cap without mutating the model', () => {
 for (const max of [1.25, 1.25, 3, 1.5, 1.5, 1.5]) {
  const p = {...pillar(max / 2), max};
  const before = JSON.stringify(p);
  assert.equal(normalizedSignalScore(p), 5);
  assert.equal(signalScore(p), max / 2);
  assert.equal(JSON.stringify(p), before);
  assert.equal(normalizedSignalScore({...p, earned:max}), 10);
  assert.equal(normalizedSignalScore({...p, earned:0, status:'absent'}), 1);
 }
 assert.equal(normalizedSignalScore(pillar(0,'unverified')), null);
 for (const earned of [-1, 2, NaN, Infinity]) assert.equal(normalizedSignalScore(pillar(earned)), null);
 assert.equal(normalizedSignalScore({...pillar(),max:0}), null);
 assert.equal(normalizedSignalScore(undefined), null);
});
test('verified zero has the approved display floor without changing earned points', () => {
 const html = render(result(pillar(0,'absent')),result({...pillar(1),max:3}));
 assert.ok(html.includes('1 / 10'));
 assert.ok(html.includes('not evidence of activity'));
 assert.equal(signalScore(pillar(0,'absent')),0);
 assert.ok(html.includes('3.3 / 10'));
});

test('evidence quality uses actual fields and explains only evidenced limitations', () => {
 const r = {...result(pillar()), confidence:'Moderate' as const, provisional:true, pagesScanned:7, socialMetrics:[], sources:[{url:'https://example.com',kind:'website',status:'unavailable' as const}]};
 const html = render(r,r);
 assert.ok(html.includes('Moderate'));
 assert.ok(html.includes('Provisional'));
 assert.ok(html.includes('1 of 1 signals supported'));
 assert.ok(html.includes('1 source(s) could not be read.'));
 assert.ok(html.includes('No social-profile metrics were returned'));
 assert.ok(!html.includes('supplied podcast could not be verified'));
 assert.ok(html.includes('not a probability of accuracy'));
 assert.ok(render(null,r).includes('evidence quality cannot be determined'));
});
test('evidence quality never supplies a missing confidence label or page count', () => {
 const html = render(result(pillar()),result(pillar()));
 assert.ok(html.includes('Evidence quality: </dt><dd class="inline">Unavailable'));
 assert.ok(html.includes('Website pages read: </dt><dd class="inline">Unavailable'));
});

test('layout puts the comparison and findings ahead of detailed evidence and methodology', () => {
 const html = render(result(pillar()),result(pillar()));
 assert.ok(html.indexOf('comparison-chart-heading') < html.indexOf('evidence-quality-heading'));
 assert.ok(html.indexOf('Where your company scores higher') < html.indexOf('score-method-heading'));
 assert.equal((html.match(/Book My Competitive Presence Analysis Review/g)||[]).length,2);
 assert.ok(html.indexOf('Where your competitor scores higher') < html.indexOf('Book My Competitive Presence Analysis Review'));
 assert.ok(html.includes('comparison-mobile-label'));
 assert.ok(html.includes('unavailable evidence is not scored'));
 assert.ok(!html.includes('min-w-[360px]'));
});
