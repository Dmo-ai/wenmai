import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/library.html', import.meta.url), 'utf8');
const source = html.split(/\r?\n/).find(line => line.includes('async function loadCatalog()'));
assert.ok(source, 'catalog loader exists');

function loader(fetch) {
  const context = { fetch, AbortController, setTimeout, clearTimeout, console };
  return vm.runInNewContext(`${source}\nloadCatalog`, context);
}

test('loads every database page beyond 500 records', async () => {
  const calls = [];
  const items = Array.from({ length: 504 }, (_, i) => ({
    cultural_identity: { id: `LW-${i + 1}` },
    visual_similarity_review: i < 483 ? '发现高相似待复核' : '待视觉复核',
  }));
  const fetch = async url => {
    if (url === 'pattern-library.json') return { ok: true, json: async () => ({ items: [] }) };
    const parsed = new URL(url);
    const offset = Number(parsed.searchParams.get('offset'));
    calls.push(offset);
    return { ok: true, json: async () => items.slice(offset, offset + 500) };
  };
  const result = await loader(fetch)();
  assert.equal(result.items.length, 504);
  assert.equal(result.items[0].visualSimilarityReview, '发现高相似待复核');
  assert.deepEqual(calls, [0, 500]);
  assert.equal(result.source, 'database');
});

test('falls back to the local catalog when the database fails', async () => {
  const fetch = async url => url === 'pattern-library.json'
    ? { ok: true, json: async () => ({ items: [{ id: 'backup' }] }) }
    : { ok: false, status: 503 };
  const result = await loader(fetch)();
  assert.equal(result.source, 'backup');
  assert.equal(result.items[0].id, 'backup');
});

