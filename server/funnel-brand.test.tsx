import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompetitiveProfile, ProcessingComparison } from '../client/src/components/competitive-profile';
import { CompetitiveResults, type ComparisonResult } from '../client/src/components/competitive-results';

const noop = () => {};
const sample = {
  companyName: 'Example', url: 'https://example.com/', domain: 'example.com',
  pillars: [{ key: 'social', label: 'Social Presence', earned: 0.5, max: 1.25,
    status: 'weak', summary: 'Public profiles found.', consequence: '', evidence: [] }],
  sources: [], socialMetrics: [], confidenceNote: 'Evidence is limited.', score: 2,
} as unknown as ComparisonResult;
const profile = () => renderToStaticMarkup(<CompetitiveProfile ownUrl="" competitorUrl="" onOwnUrlChange={noop} onCompetitorUrlChange={noop} onSubmit={noop} isPending={false} />);
const results = () => renderToStaticMarkup(<CompetitiveResults own={sample} competitor={sample} reviewUrl="https://inspiredvibe.com/contact-us/" />);

test('profile, processing and results share compact headers and retain genuine logo and star', () => {
  for (const html of [profile(), renderToStaticMarkup(<ProcessingComparison ownUrl="https://own.example" competitorUrl="https://other.example" />), results()]) {
    assert.ok(html.includes('visibility-header'));
    assert.ok(html.includes('visibility-logo'));
    assert.ok(html.includes('visibility-star'));
    assert.ok(html.includes('/brand/iv_logo_white.svg'));
    assert.ok(html.includes('/brand/IV-star.svg'));
  }
});

test('analysis uses shared brand colors and CTA styles without changing destinations or form controls', () => {
  const form = profile();
  const result = results();
  assert.ok(form.includes('hsl(var(--brand-navy))'));
  assert.ok(form.includes('hsl(var(--brand-teal))'));
  assert.ok(form.includes('visibility-cta visibility-cta-on-dark'));
  assert.equal((form.match(/<input /g) || []).length, 2);
  assert.ok(form.includes('grid-cols-1'));
  assert.ok(form.includes('type="submit"'));
  assert.equal((result.match(/class="visibility-cta max-w-full"/g) || []).length, 2);
  assert.ok(result.includes('href="https://inspiredvibe.com/contact-us/"'));
  assert.ok(result.includes('bg-brand-teal'));
  for (const old of ['#042d3e', '#16b7c9', '#c6282e', '#032f40', '#d92f39', '#0b9eb0']) {
    assert.ok(!`${form}${result}`.includes(old));
  }
});
