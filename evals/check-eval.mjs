#!/usr/bin/env node
// Grade a check run against an eval case (SPEC §18).
// Usage: node evals/check-eval.mjs <case-id> <path/to/evidence.json>
// Also checks report.md next to the evidence file for the wording rule, if it exists.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CASES = join(dirname(fileURLToPath(import.meta.url)), 'cases.json');

const repoKeys = (item) =>
  [item.id, item.url, item.github, ...Object.keys(item.other_signals || {})]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

export function gradeCase(c, evidence, reportText = null) {
  const checks = [];
  const competitors = (evidence.competitors || []).filter((x) => x.verified !== false);

  for (const repo of c.must_find || []) {
    const needle = repo.toLowerCase();
    const found = competitors.some((x) => repoKeys(x).some((k) => k.includes(needle)));
    checks.push({ check: `finds ${repo}`, pass: found });
  }
  if (c.min_competitors) {
    checks.push({ check: `≥ ${c.min_competitors} competitors`, pass: competitors.length >= c.min_competitors });
  }
  if (c.purpose) {
    checks.push({ check: `purpose = ${c.purpose}`, pass: evidence.idea?.purpose === c.purpose });
  }
  if (c.expected_verdicts) {
    const code = evidence.verdict?.code;
    checks.push({ check: `verdict in [${c.expected_verdicts.join(', ')}]`, pass: c.expected_verdicts.includes(code), actual: code ?? null });
  }
  if (c.expect_display) {
    for (const [key, value] of Object.entries(c.expect_display)) {
      checks.push({ check: `display.${key} = ${value}`, pass: evidence.display?.[key] === value });
    }
  }
  const unverifiedCited = (evidence.competitors || []).filter((x) => x.verified === false).length;
  checks.push({ check: 'scored by score.mjs', pass: Boolean(evidence.scored_at) });
  if (reportText !== null) {
    checks.push({ check: 'report never says "don\'t build"', pass: !/don['’]t build|you shouldn['’]t/i.test(reportText) });
  }
  return { case: c.id, pass: checks.every((x) => x.pass), checks, dropped_by_verification: unverifiedCited };
}

async function main() {
  const [caseId, evidencePath] = process.argv.slice(2);
  if (!caseId || !evidencePath) {
    console.log(JSON.stringify({ ok: false, error: { type: 'Usage', message: 'check-eval.mjs <case-id> <evidence.json>' } }, null, 2));
    process.exitCode = 1;
    return;
  }
  const { cases } = JSON.parse(await readFile(CASES, 'utf8'));
  const c = cases.find((x) => x.id === caseId || x.id.startsWith(`${caseId}-`));
  if (!c) throw new Error(`unknown case ${caseId}`);
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  const reportPath = join(dirname(evidencePath), 'report.md');
  const report = existsSync(reportPath) ? await readFile(reportPath, 'utf8') : null;
  const result = gradeCase(c, evidence, report);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  process.exitCode = result.pass ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.log(JSON.stringify({ ok: false, error: { type: err.name, message: err.message } }, null, 2));
    process.exitCode = 1;
  });
}
