import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const s = await load('score.mjs');
const NOW = new Date('2026-10-17T00:00:00Z').getTime();
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();

const comp = (over = {}) => ({
  id: 'github:a/b',
  name: 'b',
  url: 'https://github.com/a/b',
  source: 'github',
  match: 'direct',
  match_reason: 'same job',
  signals: { stars: 4000, pushed_at: daysAgo(5), license: 'MIT', archived: false },
  ...over,
  signals: { stars: 4000, pushed_at: daysAgo(5), license: 'MIT', archived: false, ...(over.signals || {}) },
});

const evidence = (over = {}) => ({
  idea: { text: 'an idea', purpose: 'launch' },
  competitors: [],
  gaps: [],
  gap_score: 0,
  sources_status: { github: 'ok', npm: 'ok' },
  ...over,
});


test('popularity uses one signal per source', () => {
  assert.equal(s.popularity({ signals: { stars: 9999 } }), 1);
  assert.ok(Math.abs(s.popularity({ signals: { stars: 50 } }) - Math.log10(51) / 4) < 1e-9);
  assert.ok(s.popularity({ signals: { installs: 130285 } }) > 0.99);
  assert.equal(s.popularity({ source: 'commercial', signals: { traction: true } }), 0.7);
  // strongest normalised signal across sources wins: 246 stars but 130k installs is popular
  const skill = { signals: { stars: 246 }, other_signals: { 'skills:x': { installs: 130285 } } };
  assert.ok(s.popularity(skill) > 0.99);
});

test('activity factor by last push', () => {
  assert.equal(s.activity(comp(), NOW), 1);
  assert.equal(s.activity(comp({ signals: { pushed_at: daysAgo(200) } }), NOW), 0.6);
  assert.equal(s.activity(comp({ signals: { pushed_at: daysAgo(800) } }), NOW), 0.2);
  assert.equal(s.activity(comp({ signals: { archived: true } }), NOW), 0);
});

test('saturation sanity examples from SPEC §9.1', () => {
  const tiny = s.saturation([comp({ signals: { stars: 50 } })], NOW).score;
  assert.ok(tiny >= 3 && tiny <= 4, `tiny=${tiny}`);
  const two = s.saturation([comp(), comp({ id: 'github:c/d' })], NOW).score;
  assert.ok(two >= 8 && two <= 9, `two=${two}`);
  // unverified competitors are ignored
  assert.equal(s.saturation([comp({ verified: false })], NOW).score, 0);
});

test('nothing exists yet → open space (rule 4); demand is not scored', () => {
  const r = s.scoreEvidence(evidence(), NOW);
  assert.equal(r.verdict.code, 'BUILD');
  assert.equal(r.verdict.rule, 4);
  assert.equal(r.scores.demand, undefined);
});

test('rule 1: saturated and no gap → DROP', () => {
  const e = evidence({ competitors: [comp(), comp({ id: 'github:c/d', coverage_pct: 50 })], gap_score: 2 });
  const r = s.scoreEvidence(e, NOW);
  assert.equal(r.verdict.code, 'DROP');
  assert.equal(r.verdict.rule, 1);
});

test('rule 2: active permissive project covering ≥ 80% → CONTRIBUTE', () => {
  const e = evidence({
    competitors: [comp({ coverage_pct: 85 })],
    gaps: [{ statement: 'g', evidence: ['https://x'] }],
    gap_score: 5,
  });
  assert.equal(s.scoreEvidence(e, NOW).verdict.code, 'CONTRIBUTE');
});

test('rule 3: best direct project abandoned and permissive → FORK', () => {
  const e = evidence({
    competitors: [comp({ coverage_pct: 70, signals: { pushed_at: daysAgo(700), stars: 2000 } })],
    gaps: [{ statement: 'g', evidence: ['https://x'] }],
    gap_score: 6,
  });
  assert.equal(s.scoreEvidence(e, NOW).verdict.code, 'FORK');
});

test('rule 4: little coverage → BUILD', () => {
  const e = evidence({
    competitors: [comp({ match: 'adjacent', signals: { stars: 100 } })],
  });
  assert.equal(s.scoreEvidence(e, NOW).verdict.code, 'BUILD');
});

test('rule 5: saturated but evidenced gap → BUILD_WITH_ANGLE', () => {
  const e = evidence({
    competitors: [comp({ coverage_pct: 60 }), comp({ id: 'github:c/d', coverage_pct: 50 })],
    gaps: [{ statement: 'nobody verifies output', evidence: ['https://x'] }],
    gap_score: 6,
  });
  const r = s.scoreEvidence(e, NOW);
  assert.equal(r.verdict.code, 'BUILD_WITH_ANGLE');
  assert.equal(r.display.headline, s.LABELS.BUILD_WITH_ANGLE);
});

test('rule 6: mixed evidence → UNCLEAR', () => {
  const e = evidence({
    competitors: [comp({ match: 'partial' }), comp({ id: 'github:c/d', match: 'partial' })],
    gap_score: 4,
    gaps: [{ statement: 'small', evidence: ['https://x'] }],
  });
  assert.equal(s.scoreEvidence(e, NOW).verdict.code, 'UNCLEAR');
});

test('gap is capped by the amount of evidence', () => {
  const active = [comp()];
  const g = (n, score = 9, competitors = active) =>
    s.gap({ gap_score: score, competitors, gaps: Array.from({ length: n }, (_, i) => ({ statement: `g${i}`, evidence: ['u'] })) }, NOW).score;
  assert.equal(g(0), 2);
  assert.equal(s.gap({ gap_score: 8, competitors: active, gaps: [{ statement: 'x', evidence: [] }] }, NOW).score, 2);
  assert.equal(g(1), 6);
  assert.equal(g(3), 8);
  assert.equal(g(4), 9);
  // no active direct competitor lifts the cap
  assert.equal(g(0, 9, [comp({ signals: { pushed_at: daysAgo(700) } })]), 9);
  assert.equal(s.gapCap(0, false), 2);
});

test('CONTRIBUTE and FORK need a target with real adoption', () => {
  const tinyActive = comp({ coverage_pct: 90, signals: { stars: 12 } });
  const e = evidence({
    competitors: [tinyActive, comp({ id: 'github:c/d', signals: { stars: 15 } })],
    gaps: [{ statement: 'g', evidence: ['u'] }],
    gap_score: 6,
  });
  const r = s.scoreEvidence(e, NOW);
  assert.notEqual(r.verdict.code, 'CONTRIBUTE');
  const tinyStale = evidence({
    competitors: [comp({ coverage_pct: 80, signals: { stars: 20, pushed_at: daysAgo(700) } })],
    gaps: [{ statement: 'g', evidence: ['u'] }],
    gap_score: 6,
  });
  assert.notEqual(s.scoreEvidence(tinyStale, NOW).verdict.code, 'FORK');
});

test('confidence: high needs verification; failures and thin results lower it', () => {
  const many = Array.from({ length: 12 }, (_, i) => comp({ id: `github:a/${i}` }));
  assert.equal(s.confidence(evidence({ competitors: many })), 'medium');
  assert.equal(s.confidence(evidence({ competitors: many, verification: { checked: 20, passed: 20 } })), 'high');
  assert.equal(s.confidence(evidence({ competitors: many, verification: { checked: 20, passed: 20 }, sources_status: { github: 'ok', npm: { failed: {} } } })), 'medium');
  assert.equal(s.confidence(evidence({ competitors: [comp()] })), 'low');
});

test('fun and personal projects get no verdict, only a hint', () => {
  const base = { competitors: [comp(), comp({ id: 'github:c/d' })], gap_score: 1 };
  const fun = s.scoreEvidence(evidence({ ...base, idea: { text: 'x', purpose: 'fun' } }), NOW);
  assert.equal(fun.display.show_verdict, false);
  assert.match(fun.display.headline, /fun/);
  const me = s.scoreEvidence(evidence({ ...base, idea: { text: 'x', purpose: 'me' } }), NOW);
  assert.match(me.display.hint, /save you time/);
  assert.equal(fun.verdict.code, null);
  assert.equal(me.verdict.code, null);
  assert.equal(me.scores.gap, null);
});

test('validation rejects incomplete evidence', () => {
  const errors = s.validateEvidence({ idea: { text: 'x', purpose: 'maybe' }, competitors: [{ id: 'a', url: 'u', match: 'direct' }], market_signals: [{}] });
  assert.ok(errors.some((e) => e.includes('purpose')));
  assert.ok(errors.some((e) => e.includes('match_reason')));
  assert.ok(errors.some((e) => e.includes('market_signals[0]')));
  assert.throws(() => s.scoreEvidence({ idea: {} }, NOW), /invalid evidence/);
});

test('display never tells the user not to build', () => {
  for (const code of Object.keys(s.LABELS)) {
    for (const purpose of ['fun', 'me', 'launch']) {
      const d = s.display(code, purpose, 9);
      assert.doesNotMatch(`${d.headline} ${d.hint || ''}`, /don't build|shouldn't/i);
    }
  }
});

test('extreme saturation with only minor gaps is already well covered, even with a joinable project', () => {
  const now = Date.parse('2026-10-17');
  const leader = { id: 'github:a/b', match: 'direct', coverage_pct: 90, signals: { stars: 23000, license: 'MIT', pushed_at: '2026-10-16' } };
  assert.equal(s.decideVerdict({ sat: 10, dem: 9.8, gapScore: 4, competitors: [leader], now }).code, 'DROP');
  assert.equal(s.decideVerdict({ sat: 8.5, dem: 9.8, gapScore: 4, competitors: [leader], now }).code, 'CONTRIBUTE');
});
