import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {FounderFootprintReport} from '../client/src/components/founder-footprint';
test('unknown leadership is not presented as absent and malicious links do not render',()=>{
 const missing=renderToStaticMarkup(<FounderFootprintReport label="Company"/>);assert.ok(missing.includes('does not establish that they are absent'));
 const html=renderToStaticMarkup(<FounderFootprintReport label="Company" value={{version:'founder-v1',status:'found',requests:1,limited:true,note:'Evidence',people:[{name:'Jane Smith',role:'Founder',sourceUrl:'https://company.example/team',excerpt:'Jane Smith Founder',podcasts:[],profiles:[{url:'javascript:alert(1)',sourceUrl:'https://company.example/team',platform:'instagram',metrics:[]}]}]}}/>);
 assert.ok(!html.includes('href="javascript'));assert.ok(html.includes('coverage is partial'));assert.ok(html.includes('public metrics unavailable'));
});
