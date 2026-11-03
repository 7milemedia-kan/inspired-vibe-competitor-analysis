import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {SupplementaryEvidence} from '../client/src/components/supplementary-evidence';
import {discoverEvidence} from './evidence-discovery';
test('source-specific rendering is escaped, truthful and safe',async()=>{
 const trace=await discoverEvidence('https://brand.test',async url=>({ok:true,status:200,finalUrl:url,body:'<h1>Awards &lt;script&gt; </h1>'+'Public observations. '.repeat(9)+'<a href="https://instagram.com/client">Client channel</a>'}));
 trace.observations[0].excerpt='<script>alert(1)</script>';
 const html=renderToStaticMarkup(<SupplementaryEvidence trace={trace} status="available" label="Your company"/>);
 assert.ok(html.includes('ownership unverified'));assert.ok(html.includes('not independently corroborated'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('https://brand.test'));assert.ok(html.includes('<details'));assert.ok(html.includes('break-all'));
});
test('legacy results omit optional section and collection failure is not absence',()=>{
 assert.equal(renderToStaticMarkup(<SupplementaryEvidence label="Your company"/>),'');
 const html=renderToStaticMarkup(<SupplementaryEvidence status="unavailable" label="Your company"/>);assert.ok(html.includes('does not mean no evidence exists'));
});
