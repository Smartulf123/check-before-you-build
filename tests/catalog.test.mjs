import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const catalog = await load('catalog.mjs');

const entries = [
  { id: 'microsoft/playwright', name: 'Playwright', category: 'browser-automation', kinds: ['library'], tags: ['browser', 'testing', 'automation'], use_for: 'Automate real browsers', why: 'Fast, reliable, maintained by Microsoft' },
  { id: 'heygen-com/hyperframes', name: 'HyperFrames', category: 'video-media', kinds: ['library', 'skill'], tags: ['video', 'animation'], use_for: 'Render video from HTML', why: 'Agent-native' },
  { id: 'vercel/next.js', name: 'Next.js', category: 'web-frameworks', kinds: ['framework'], tags: ['react', 'website'], use_for: 'Build websites', why: 'Most popular React framework' },
];

test('categories file lists every SPEC §8.4 category', async () => {
  const cats = await catalog.loadCategories();
  assert.equal(cats.length, 38);
  assert.ok(cats.every((c) => c.slug && c.name && c.description));
  assert.equal(new Set(cats.map((c) => c.slug)).size, 38);
});

test('search filters by category and ranks keyword hits', () => {
  const byCat = catalog.searchEntries(entries, { categories: ['video-media'] });
  assert.deepEqual(byCat.map((r) => r.name), ['HyperFrames']);

  const byWords = catalog.searchEntries(entries, { keywords: ['browser automation'] });
  assert.equal(byWords[0].name, 'Playwright');
  assert.equal(byWords[0].id, 'github:microsoft/playwright');
  assert.equal(byWords[0].from_catalog, true);
});

test('search filters by kind and drops non-matching keywords', () => {
  assert.deepEqual(catalog.searchEntries(entries, { kinds: ['skill'] }).map((r) => r.name), ['HyperFrames']);
  assert.equal(catalog.searchEntries(entries, { keywords: ['payments'] }).length, 0);
});
