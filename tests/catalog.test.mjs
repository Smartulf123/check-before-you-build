import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const catalog = await load('catalog.mjs');

const entries = [
  { id: 'microsoft/playwright', name: 'Playwright', category: 'browser-automation', kinds: ['library'], tags: ['browser', 'testing', 'automation'], use_for: 'Automate real browsers', why: 'Fast, reliable, maintained by Microsoft' },
  { id: 'heygen-com/hyperframes', name: 'HyperFrames', category: 'video-media', kinds: ['library', 'skill'], tags: ['video', 'animation'], use_for: 'Render video from HTML', why: 'Agent-native' },
  { id: 'vercel/next.js', name: 'Next.js', category: 'web-frameworks', kinds: ['framework'], tags: ['react', 'website'], use_for: 'Build websites', why: 'Most popular React framework' },
];

test('categories file: 50 categories and 20 domains, all consistent (SPEC §8.4)', async () => {
  const cats = await catalog.loadCategories();
  const domains = await catalog.loadDomains();
  assert.equal(cats.length, 50);
  assert.equal(new Set(cats.map((c) => c.slug)).size, 50);
  assert.ok(cats.every((c) => c.slug && c.name && c.description && c.group && c.queries?.length));
  assert.equal(domains.length, 20);
  const slugs = new Set(cats.map((c) => c.slug));
  for (const d of domains) {
    for (const s of d.categories) assert.ok(slugs.has(s), `domain ${d.slug} points to unknown category ${s}`);
  }
  const used = new Set(domains.flatMap((d) => d.categories));
  assert.deepEqual([...slugs].filter((s) => !used.has(s)), [], 'every category is used by a domain');
});

test('search filters by category and ranks keyword hits', () => {
  const byCat = catalog.searchEntries(entries, { categories: ['video-media'] });
  assert.deepEqual(byCat.map((r) => r.name), ['HyperFrames']);

  const byWords = catalog.searchEntries(entries, { keywords: ['browser automation'] });
  assert.equal(byWords[0].name, 'Playwright');
  assert.equal(byWords[0].id, 'github:microsoft/playwright');
  assert.equal(byWords[0].from_catalog, true);
});

test('search matches README-derived keywords and summaries, and returns them', () => {
  const rich = [{ ...entries[2], keywords: ['ssr', 'server components'], summary: 'Hybrid static and server rendering.', best_for: 'Production React apps', not_for: 'Tiny static pages' }];
  const out = catalog.searchEntries(rich, { keywords: ['server components'] });
  assert.equal(out[0].name, 'Next.js');
  assert.equal(out[0].not_for, 'Tiny static pages');
  assert.equal(catalog.searchEntries(rich, { keywords: ['hybrid rendering'] }).length, 1);
});

test('search filters by kind and drops non-matching keywords', () => {
  assert.deepEqual(catalog.searchEntries(entries, { kinds: ['skill'] }).map((r) => r.name), ['HyperFrames']);
  assert.equal(catalog.searchEntries(entries, { keywords: ['payments'] }).length, 0);
});
