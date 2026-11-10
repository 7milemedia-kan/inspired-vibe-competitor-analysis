import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {VisibilityLogo, VisibilityStar} from '../client/src/components/visibility-brand';
import {CompetitiveProfile, ProcessingComparison} from '../client/src/components/competitive-profile';
test('genuine asset URLs, aspect ratio, responsive width and decorative star semantics',()=>{
 const logo=renderToStaticMarkup(<VisibilityLogo />); const star=renderToStaticMarkup(<VisibilityStar />);
 assert.ok(logo.includes('/brand/iv_logo_white.svg')); assert.ok(logo.includes('width="325" height="72"')); assert.ok(logo.includes('max-w-full')); assert.ok(logo.includes('h-auto')); assert.ok(logo.includes('alt="INSPIRED Vibe'));
 assert.ok(star.includes('/brand/IV-star.svg')); assert.ok(star.includes('aria-hidden="true"')); assert.ok(star.includes('width="55" height="63"'));
});
test('input and processing replace old mark without changing form flow',()=>{
 const noop=()=>{};
 for(const html of [renderToStaticMarkup(<CompetitiveProfile ownUrl="" competitorUrl="" onOwnUrlChange={noop} onCompetitorUrlChange={noop} onSubmit={noop} isPending={false}/>),renderToStaticMarkup(<ProcessingComparison ownUrl="https://own.example" competitorUrl="https://other.example"/>)]) {
 assert.ok(html.includes('/brand/iv_logo_white.svg')); assert.ok(html.includes('/brand/IV-star.svg')); assert.ok(!html.includes('Authority Impact Model'));
 }
});
