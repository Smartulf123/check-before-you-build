import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, mockFetch } from './helpers.mjs';

const { verifyEvidence, correctDrift } = await load('verify.mjs');

const repoJson = (full_name, stars = 4000) => ({
  full_name,
  name: full_name.split('/')[1],
  html_url: `https://github.com/${full_name}`,
  stargazers_count: stars,
  forks_count: 100,
  pushed_at: '2026-10-10T00:00:00Z',
  license: { spdx_id: 'MIT' },
  archived: false,
});

test('correctDrift replaces numbers and records > 10 % changes only', () => {
  const item = { id: 'github:a/b', signals: { stars: 1000 } };
  assert.deepEqual(correctDrift(item, { stars: 1050 }), []);
  assert.equal(item.signals.stars, 1050);
  const changed = correctDrift(item, { stars: 2000, license: 'MIT' });
  assert.equal(changed.length, 1);
  assert.equal(changed[0].to, 2000);
  assert.equal(item.signals.license, 'MIT');
});

test('fake repos are dropped, renames updated, catalog entries use the snapshot without API calls', async () => {
  const calls = mockFetch([
    ['repos/fake/repo', { status: 404 }],
    ['repos/old/name', { json: repoJson('new/name', 9000) }],
    ['example.com/thread', { status: 200 }],
  ]);
  const evidence = {
    competitors: [
      { id: 'github:fake/repo', url: 'https://github.com/fake/repo', match: 'direct', readme_read: true, signals: { stars: 99999 } },
      { id: 'github:old/name', url: 'https://github.com/old/name', match: 'partial', readme_read: true, signals: { stars: 1000 } },
      { id: 'github:vercel/next.js', url: 'https://github.com/vercel/next.js', match: 'adjacent', signals: {} },
    ],
    building_blocks: [{ id: 'github:microsoft/playwright', url: 'https://github.com/microsoft/playwright', from_catalog: true, readme_read: true, signals: {} }],
    demand: [
      { type: 'hn_story', url: 'https://news.ycombinator.com/item?id=1' },
      { type: 'request', url: 'https://example.com/thread' },
    ],
  };
  const snapshot = { generated_at: '2026-10-17', repos: { 'microsoft/playwright': { stars: 97905, license: 'Apache-2.0' }, 'vercel/next.js': { stars: 143000 } } };
  const { stats, log } = await verifyEvidence(evidence, { snapshot, catalogIds: new Set(['vercel/next.js', 'microsoft/playwright']) });

  assert.equal(evidence.competitors[0].verified, false);
  assert.equal(evidence.competitors[1].id, 'github:new/name');
  assert.equal(evidence.competitors[1].signals.stars, 9000);
  assert.equal(evidence.competitors[2].stats_source, 'snapshot 2026-10-17');
  assert.equal(evidence.building_blocks[0].signals.stars, 97905);
  assert.equal(stats.dropped, 1);
  assert.ok(stats.corrected >= 2); // rename + star drift
  assert.equal(evidence.verification.checked, stats.checked);
  // catalog repos and HN links never hit the network
  assert.ok(!calls.some((u) => u.includes('playwright') || u.includes('next.js') || u.includes('ycombinator')));
  assert.deepEqual(log.readme_missing, []);
});

test('dead demand links are dropped; unreachable product sites are kept and labelled', async () => {
  mockFetch([
    ['dead.example', { status: 404 }],
    ['product.example', { status: 503 }],
  ]);
  const evidence = {
    competitors: [{ id: 'commercial:acme', url: 'https://product.example', source: 'commercial', match: 'direct', readme_read: true }],
    demand: [{ type: 'web', url: 'https://dead.example/post' }],
  };
  const { log } = await verifyEvidence(evidence);
  assert.equal(evidence.demand[0].verified, false);
  assert.equal(evidence.competitors[0].verified, true);
  assert.equal(evidence.competitors[0].link_status, 'unreachable');
  assert.equal(log.labelled.length, 1);
});

test('plugins inside a bigger repo keep their own signals; products and non-repo items need no README', async () => {
  const calls = mockFetch([['github.com/anthropics/claude-plugins-official', { status: 200 }], ['acme.example', { status: 200 }]]);
  const evidence = {
    competitors: [
      { id: 'plugin:receipts', url: 'https://github.com/anthropics/claude-plugins-official/tree/main/plugins/receipts', match: 'direct', signals: {} },
      { id: 'commercial:acme', url: 'https://acme.example', source: 'commercial', match: 'direct' },
    ],
  };
  const { log } = await verifyEvidence(evidence);
  assert.equal(evidence.competitors[0].signals.stars, undefined); // no marketplace-repo stars
  assert.ok(!calls.some((u) => u.includes('api.github.com')));
  assert.deepEqual(log.readme_missing, []);
});

test('recommended repos without a read README are flagged', async () => {
  const evidence = {
    competitors: [{ id: 'github:a/b', url: 'https://github.com/a/b', match: 'direct', from_catalog: true }],
    building_blocks: [{ id: 'github:c/d', url: 'https://github.com/c/d', from_catalog: true }],
  };
  const { log } = await verifyEvidence(evidence, { catalogIds: new Set(['a/b', 'c/d']) });
  assert.deepEqual(log.readme_missing.sort(), ['github:a/b', 'github:c/d']);
});

test('products worth studying are link-checked and labelled, never dropped', async () => {
  mockFetch([['oura.example', { status: 200 }], ['gone.example', { status: 404 }]]);
  const evidence = {
    competitors: [],
    inspiration: [
      { name: 'Oura', url: 'https://oura.example', kind: 'ios-app' },
      { name: 'Gone', url: 'https://gone.example', kind: 'website' },
    ],
  };
  await verifyEvidence(evidence);
  assert.equal(evidence.inspiration[0].verified, true);
  assert.equal(evidence.inspiration[1].verified, true);
  assert.equal(evidence.inspiration[1].link_status, 'unreachable');
});
