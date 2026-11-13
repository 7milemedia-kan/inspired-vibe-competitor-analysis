import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mobile viewport allows user pinch zoom and respects device width', () => {
  const html = readFileSync(new URL('../client/index.html', import.meta.url), 'utf8');
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/)?.[1];
  assert.ok(viewport?.includes('width=device-width'));
  assert.ok(viewport?.includes('initial-scale=1'));
  assert.ok(!/maximum-scale|user-scalable\s*=\s*(?:no|0)/i.test(viewport!));
});
