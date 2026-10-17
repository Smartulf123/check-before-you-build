import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { validateStatic } from '../scripts/catalog-validate.mjs';
import { draftEntry } from '../scripts/catalog-add.mjs';
import { qualityQualifiers, renderReport as scoutReport } from '../scripts/scout.mjs';
import { renderReport as healthReport } from '../scripts/health.mjs';

const categoriesDoc = {
  categories: [{ slug: 'testing' }, { slug: 'starters' }],
  domains: [{ slug: 'websites' }],
};

const entry = (over = {}) => ({
  id: 'microsoft/playwright',
  name: 'Playwright',
  category: 'testing',
  kinds: ['library'],
  tags: ['e2e'],
  use_for: 'End-to-end testing in real browsers.',
  why: 'Fast, reliable, maintained by Microsoft.',
  added: '2026-10-17',
  last_reviewed: '2026-10-17',
  ...over,
});

test('validateStatic accepts a clean file', () => {
  const r = validateStatic([{ file: 'testing.json', data: { category: 'testing', entries: [entry()] } }], categoriesDoc);
  assert.deepEqual(r.errors, []);
  assert.equal(r.total, 1);
  assert.ok(r.warnings.some((w) => w.includes('only 1 entries')));
});

test('validateStatic catches missing fields, bad kinds, TODO why, duplicates, unknown domains', () => {
  const files = [
    { file: 'testing.json', data: { category: 'testing', entries: [entry({ kinds: ['rocket'], why: 'TODO: x' }), entry({ name: 'Dup' })] } },
    { file: 'starters.json', data: { category: 'starters', entries: [entry({ id: 'a/b', category: 'starters', domains: ['moon'], use_for: '' })] } },
  ];
  const { errors } = validateStatic(files, categoriesDoc);
  assert.ok(errors.some((e) => e.includes('unknown kind "rocket"')));
  assert.ok(errors.some((e) => e.includes('why is still TODO')));
  assert.ok(errors.some((e) => e.includes('duplicate of')));
  assert.ok(errors.some((e) => e.includes('unknown domain "moon"')));
  assert.ok(errors.some((e) => e.includes('missing use_for')));
});

test('validateStatic enforces the 12-per-category maximum', () => {
  const many = Array.from({ length: 13 }, (_, i) => entry({ id: `o/r${i}`, name: `R${i}` }));
  const { errors } = validateStatic([{ file: 'testing.json', data: { category: 'testing', entries: many } }], categoriesDoc);
  assert.ok(errors.some((e) => e.includes('13 entries (max 12)')));
});

test('draftEntry fills sensible defaults from the repo', () => {
  const d = draftEntry({ full_name: 'microsoft/playwright', description: 'Browser automation', topics: ['e2e', 'testing'] }, { npm: 'playwright' }, 'testing');
  assert.equal(d.name, 'playwright');
  assert.deepEqual(d.tags, ['e2e', 'testing']);
  assert.equal(d.npm, 'playwright');
  assert.match(d.why, /^TODO/);
});

test('scout builds the quality floor into the query', () => {
  const q = qualityQualifiers(new Date('2026-10-17T00:00:00Z').getTime());
  assert.equal(q, 'stars:>=1000 pushed:>=2026-04-20 archived:false');
});

test('reports render tables', () => {
  const s = scoutReport({ testing: [{ full_name: 'a/b', url: 'u', signals: { stars: 2000, pushed_at: '2026-10-01' }, description: 'x | y', evaluation: { pass: true, tier: 'solid' } }] }, '2026-10-17T00:00:00Z');
  assert.match(s, /\| \[a\/b\]\(u\) \| 2000 \| 2026-10-01 \| ✅ Solid \| x \/ y \|/);
  const h = healthReport([{ id: 'a/b', category: 'testing', pass: false, tier: null, reasons: ['archived'], warnings: [], stars: 10, days_since_push: 400, contributors: 1 }], '2026-10-17T00:00:00Z');
  assert.match(h, /❌ 1 failing/);
  assert.match(h, /archived/);
});
