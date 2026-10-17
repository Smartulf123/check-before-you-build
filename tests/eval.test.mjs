import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { gradeCase } from '../evals/check-eval.mjs';

const { cases } = JSON.parse(readFileSync(new URL('../evals/cases.json', import.meta.url), 'utf8'));
const designCase = cases.find((c) => c.id === '1-design-extractor');

test('eval cases are well formed', () => {
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
  for (const c of cases) {
    assert.ok(c.idea && c.purpose, `${c.id} needs idea and purpose`);
    assert.ok(c.expected_verdicts || c.expect_display, `${c.id} needs an expectation`);
  }
});

test('gradeCase passes when must-find repos and verdict match', () => {
  const evidence = {
    idea: { purpose: 'launch' },
    competitors: [
      { id: 'github:Manavarya09/design-extract', url: 'https://github.com/Manavarya09/design-extract' },
      { id: 'npm:dembrandt', url: 'https://www.npmjs.com/package/dembrandt', github: 'dembrandt/dembrandt' },
    ],
    verdict: { code: 'BUILD_WITH_ANGLE' },
    scored_at: '2026-10-17',
  };
  const result = gradeCase(designCase, evidence, 'Here is the landscape.');
  assert.equal(result.pass, true, JSON.stringify(result.checks));
});

test('gradeCase fails on a missed repo, a dropped repo, or forbidden wording', () => {
  const evidence = {
    idea: { purpose: 'launch' },
    competitors: [{ id: 'github:Manavarya09/design-extract', url: 'u' }, { id: 'github:dembrandt/dembrandt', url: 'u', verified: false }],
    verdict: { code: 'BUILD_WITH_ANGLE' },
    scored_at: 'x',
  };
  const result = gradeCase(designCase, evidence, "You shouldn't build this.");
  assert.equal(result.pass, false);
  assert.equal(result.checks.find((c) => c.check === 'finds dembrandt/dembrandt').pass, false);
  assert.equal(result.checks.find((c) => c.check.startsWith('report never')).pass, false);
});
