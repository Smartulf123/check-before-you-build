import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, mockFetch } from './helpers.mjs';

const { licenseClass, allowedRecommendations, recommendationWarning } = await load('lib/license.mjs');
const { parseArgs, intFlag } = await load('lib/cli.mjs');
const { fetchJson } = await load('lib/http.mjs');

test('license classes', () => {
  assert.equal(licenseClass('MIT'), 'permissive');
  assert.equal(licenseClass('Apache-2.0'), 'permissive');
  assert.equal(licenseClass('GPL-3.0'), 'copyleft');
  assert.equal(licenseClass('AGPL-3.0-only'), 'copyleft');
  assert.equal(licenseClass(null), 'none');
  assert.equal(licenseClass('NOASSERTION'), 'other');
  assert.equal(licenseClass('Some Custom License'), 'other');
  assert.equal(licenseClass('PostgreSQL'), 'permissive');
  assert.equal(licenseClass('BlueOak-1.0.0'), 'permissive');
});

test('recommendation rules per license class', () => {
  assert.deepEqual(allowedRecommendations('none'), ['learn']);
  assert.ok(allowedRecommendations('permissive').includes('fork'));
  assert.match(recommendationWarning('copyleft', 'fork'), /Copyleft/);
  assert.match(recommendationWarning('none', 'fork'), /no right to copy/);
  assert.equal(recommendationWarning('permissive', 'fork'), null);
});

test('parseArgs handles positionals, --flag value, --flag=value and booleans', () => {
  const a = parseArgs(['search', 'design', 'tokens', '--limit', '5', '--min-stars=0', '--by-date']);
  assert.deepEqual(a._, ['search', 'design', 'tokens']);
  assert.equal(intFlag(a.flags, 'limit', 20), 5);
  assert.equal(intFlag(a.flags, 'min-stars', 20), 0);
  assert.equal(a.flags['by-date'], true);
  assert.equal(intFlag({}, 'limit', 20), 20);
});

test('fetchJson retries a server error and then succeeds', async () => {
  let n = 0;
  globalThis.fetch = async () => {
    n++;
    return n === 1
      ? new Response('oops', { status: 502 })
      : new Response(JSON.stringify({ ok: 1 }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const { data } = await fetchJson('https://example.test/x', { retries: 2 });
  assert.deepEqual(data, { ok: 1 });
  assert.equal(n, 2);
});

test('fetchJson throws HttpError with status on a client error', async () => {
  mockFetch([['example.test', { status: 401, json: { message: 'nope' } }]]);
  await assert.rejects(fetchJson('https://example.test/y'), (err) => err.name === 'HttpError' && err.status === 401);
});

test('scripts run when the skill folder is a symlink or junction (installed skills)', async () => {
  const { mkdtempSync, symlinkSync, rmSync, unlinkSync, rmdirSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const scripts = fileURLToPath(new URL('../skills/check-before-you-build/scripts/', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'cbyb-link-'));
  const link = join(dir, 'scripts');
  symlinkSync(scripts, link, 'junction');
  try {
    const out = execFileSync(process.execPath, [join(link, 'catalog.mjs'), 'categories'], { encoding: 'utf8' });
    assert.equal(JSON.parse(out).ok, true);
  } finally {
    // remove the link itself first so a recursive delete can never reach the real folder
    try { unlinkSync(link); } catch { rmdirSync(link); }
    rmSync(dir, { recursive: true, force: true });
  }
});
