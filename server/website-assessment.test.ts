import test from 'node:test';
import assert from 'node:assert/strict';
import { assessWebsites, websiteUrl } from '../client/src/lib/website-assessment';

test('website-only flow validates both inputs before making requests', async () => {
  for (const invalid of ['', 'localhost', '127.0.0.1', 'https://user:password@example.com', 'https://internal.local', 'file:///tmp/a']) {
    assert.throws(() => websiteUrl(invalid));
  }
  let calls = 0;
  await assert.rejects(assessWebsites('example.com', '', async () => ++calls));
  assert.equal(calls, 0);
});

test('each website uses the same scorer and matching URLs are requested once', async () => {
  const calls: string[] = [];
  const score = async (url: string) => { calls.push(url); return { url, score: 5 }; };
  const result = await assessWebsites('own.example.com', 'competitor.example.com', score);
  assert.equal(result.own?.url, 'https://own.example.com/');
  assert.equal(result.competitor.url, 'https://competitor.example.com/');
  assert.equal(result.ownUnavailable, false);
  assert.equal(calls.length, 2);
  calls.length = 0;
  const same = await assessWebsites('example.com', 'https://example.com/#section', score);
  assert.equal(calls.length, 1);
  assert.equal(same.own, same.competitor);
});

test('own-site failure is unknown, never a fabricated zero; competitor failure rejects', async () => {
  const partial = await assessWebsites('own.example.com', 'competitor.example.com', async url => {
    if (url.includes('own.')) throw new Error('unavailable');
    return { score: 5 };
  });
  assert.equal(partial.own, null);
  assert.equal(partial.ownUnavailable, true);
  assert.equal(partial.competitor.score, 5);
  await assert.rejects(assessWebsites('own.example.com', 'competitor.example.com', async url => {
    if (url.includes('competitor.')) throw new Error('unavailable');
    return { score: 5 };
  }));
});

test('both failures reject without reusing an earlier result', async () => {
  const success = await assessWebsites('own.example.com', 'competitor.example.com', async () => ({ score: 7 }));
  assert.equal(success.competitor.score, 7);
  await assert.rejects(assessWebsites('own.example.com', 'competitor.example.com', async () => { throw new Error('unavailable'); }));
});
