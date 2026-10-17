import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { evaluate, adoptionLevel, freshnessLabel } = await load('lib/criteria.mjs');
const { countFromLink } = await load('github.mjs');

const NOW = new Date('2026-10-17T00:00:00Z').getTime();
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();
const repo = (signals = {}, extra = {}) => ({
  signals: { stars: 5000, forks: 400, pushed_at: daysAgo(10), license: 'MIT', archived: false, ...signals },
  contributors: 40,
  ...extra,
});

test('top choice: ≥ 3,000 stars and pushed ≤ 90 days', () => {
  const r = evaluate(repo(), NOW);
  assert.equal(r.pass, true);
  assert.equal(r.tier, 'top');
  assert.equal(r.freshness, 'very fresh');
});

test('solid: ≥ 1,000 stars, or top stars but 3–6 months old', () => {
  assert.equal(evaluate(repo({ stars: 1500, forks: 100 }), NOW).tier, 'solid');
  const older = evaluate(repo({ pushed_at: daysAgo(120) }), NOW);
  assert.equal(older.tier, 'solid');
  assert.ok(older.warnings.some((w) => w.includes('3–6 months')));
});

test('excluded: too few stars, too old, archived, no license, few contributors', () => {
  assert.match(evaluate(repo({ stars: 400, forks: 50 }), NOW).reasons.join(), /not enough adoption/);
  assert.match(evaluate(repo({ pushed_at: daysAgo(240) }), NOW).reasons.join(), /last push 240 days/);
  assert.match(evaluate(repo({ archived: true }), NOW).reasons.join(), /archived/);
  assert.match(evaluate(repo({ license: null }), NOW).reasons.join(), /no license/);
  assert.match(evaluate(repo({}, { contributors: 2 }), NOW).reasons.join(), /only 2 contributor/);
});

test('alternative signals replace stars', () => {
  assert.equal(adoptionLevel({ stars: 246, installs: 130285 }), 'top');
  assert.equal(adoptionLevel({ stars: 10, downloads_weekly: 60000 }), 'solid');
  assert.equal(adoptionLevel({ stars: 10, uses: 2000 }), 'solid');
  assert.equal(adoptionLevel({ stars: 10 }), null);
  const skill = evaluate(repo({ stars: 246, forks: 34, installs: 130285 }), NOW);
  assert.equal(skill.pass, true);
  assert.equal(skill.tier, 'top');
});

test('official vendor repos qualify; top only when fresh', () => {
  assert.equal(evaluate(repo({ stars: 300, forks: 40 }, { official: true }), NOW).tier, 'top');
  assert.equal(evaluate(repo({ stars: 300, forks: 40, pushed_at: daysAgo(150) }, { official: true }), NOW).tier, 'solid');
});

test('stable exception: ≥ 5,000 stars + reason, up to 18 months, never top', () => {
  const ok = evaluate(repo({ stars: 9000, pushed_at: daysAgo(400) }, { stable: true, stable_reason: 'feature complete' }), NOW);
  assert.equal(ok.pass, true);
  assert.equal(ok.tier, 'solid');
  const tooSmall = evaluate(repo({ stars: 2000, forks: 200, pushed_at: daysAgo(400) }, { stable: true, stable_reason: 'x' }), NOW);
  assert.equal(tooSmall.pass, false);
  const noReason = evaluate(repo({ stars: 9000, pushed_at: daysAgo(400) }, { stable: true }), NOW);
  assert.match(noReason.reasons.join(), /stable_reason/);
  const tooOld = evaluate(repo({ stars: 9000, pushed_at: daysAgo(600) }, { stable: true, stable_reason: 'x' }), NOW);
  assert.equal(tooOld.pass, false);
});

test('fake-star heuristic: many stars, almost no forks, ≤ 2 contributors', () => {
  const fake = evaluate(repo({ stars: 8000, forks: 20 }, { contributors: 1 }), NOW);
  assert.match(fake.reasons.join(), /fake stars/);
  // few forks alone is fine when there are many contributors
  assert.equal(evaluate(repo({ stars: 8000, forks: 20 }, { contributors: 30 }), NOW).pass, true);
});

test('NOASSERTION license warns for manual review instead of rejecting', () => {
  const r = evaluate(repo({ license: 'NOASSERTION' }), NOW);
  assert.equal(r.pass, true);
  assert.ok(r.warnings.some((w) => w.includes('verify by hand')));
  assert.equal(evaluate(repo({ license: 'Custom-Proprietary' }), NOW).pass, false);
});

test('no detected license fails unless a human verified it', () => {
  const none = evaluate(repo({ license: null }), NOW);
  assert.equal(none.pass, false);
  assert.match(none.reasons.join(), /verify by hand/);
  const verified = evaluate(repo({ license: null }, { license_verified: { license: 'Apache-2.0', note: 'per-skill licenses', date: '2026-10-17' } }), NOW);
  assert.equal(verified.pass, true);
  assert.ok(verified.warnings.some((w) => w.includes('per-skill licenses')));
  const bogus = evaluate(repo({ license: null }, { license_verified: { license: 'All-Rights-Reserved', date: '2026-10-17' } }), NOW);
  assert.equal(bogus.pass, false);
});

test('maintainer exception waives only the named rules and is labelled', () => {
  const ex = { rules: ['contributors', 'fake_stars'], reason: 'exclusive, high-quality design skill', date: '2026-10-17' };
  const pick = evaluate(repo({ stars: 3500, forks: 20 }, { contributors: 1, exception: ex }), NOW);
  assert.equal(pick.pass, true);
  assert.equal(pick.maintainer_pick, true);
  assert.ok(pick.warnings.some((w) => w.startsWith('maintainer exception (contributors)')));
  // a license problem can never be waived
  const noLicense = evaluate(repo({ license: null }, { contributors: 1, exception: { ...ex, rules: ['contributors', 'license'] } }), NOW);
  assert.equal(noLicense.pass, false);
  // an exception without a reason/date is rejected
  const sloppy = evaluate(repo({}, { contributors: 1, exception: { rules: ['contributors'] } }), NOW);
  assert.equal(sloppy.pass, false);
  // normal entries are never maintainer picks
  assert.equal(evaluate(repo(), NOW).maintainer_pick, false);
});

test('unknown contributors or push date only warn', () => {
  const r = evaluate(repo({}, { contributors: undefined }), NOW);
  assert.equal(r.pass, true);
  assert.ok(r.warnings.includes('contributor count unknown'));
});

test('freshness labels', () => {
  assert.equal(freshnessLabel(5), 'very fresh');
  assert.equal(freshnessLabel(60), 'fresh');
  assert.equal(freshnessLabel(150), 'ok');
  assert.equal(freshnessLabel(200), 'stale');
});

test('contributor count from GitHub Link header', () => {
  const link = '<https://api.github.com/repositories/1/contributors?per_page=1&anon=1&page=2>; rel="next", <https://api.github.com/repositories/1/contributors?per_page=1&anon=1&page=137>; rel="last"';
  assert.equal(countFromLink(link, 1), 137);
  assert.equal(countFromLink(null, 1), 1);
  assert.equal(countFromLink(null, 0), 0);
});
