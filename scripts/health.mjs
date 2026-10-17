#!/usr/bin/env node
// Weekly health check (SPEC §8.5): re-checks every catalog entry against the quality rules,
// writes health-report.md, and refreshes catalog/.cache/stats.json (the skill's offline fallback).
// Usage: node scripts/health.mjs [--report health-report.md]
import { mkdir, writeFile } from 'node:fs/promises';
import { parseArgs } from '../skills/check-before-you-build/scripts/lib/cli.mjs';
import { statusLabel } from '../skills/check-before-you-build/scripts/lib/criteria.mjs';
import { CATALOG_DIR, readAllCategoryFiles } from './lib/catalog-files.mjs';
import { checkRepoPatient as checkRepo } from './lib/repo-check.mjs';

export function renderReport(rows, generatedAt) {
  const failing = rows.filter((r) => !r.pass);
  const renamed = rows.filter((r) => r.renamed);
  const warned = rows.filter((r) => r.pass && r.warnings.length);
  const lines = [
    `# Catalog health report`,
    '',
    `${generatedAt.slice(0, 10)} · ${rows.length} entries · ❌ ${failing.length} failing · ⚠️ ${warned.length} with warnings · ↪ ${renamed.length} renamed`,
    '',
  ];
  if (failing.length) {
    lines.push('## ❌ Failing the quality rules (remove or fix)', '', '| Entry | Category | Reasons |', '|---|---|---|');
    for (const r of failing) lines.push(`| [${r.id}](https://github.com/${r.id}) | ${r.category} | ${r.reasons.join('; ')} |`);
    lines.push('');
  }
  if (renamed.length) {
    lines.push('## ↪ Renamed (update the id)', '');
    for (const r of renamed) lines.push(`- ${r.id} → ${r.full_name}`);
    lines.push('');
  }
  if (warned.length) {
    lines.push('## ⚠️ Warnings', '', '| Entry | Warnings |', '|---|---|');
    for (const r of warned) lines.push(`| ${r.id} | ${r.warnings.join('; ')} |`);
    lines.push('');
  }
  lines.push('## All entries', '', '| Entry | Category | Status | Stars | Last push | Contributors |', '|---|---|---|---|---|---|');
  for (const r of rows) {
    lines.push(`| ${r.id} | ${r.category} | ${statusLabel({ pass: r.pass, maintainer_pick: r.maintainer_pick, reasons: r.reasons })} | ${r.stars ?? '–'} | ${r.days_since_push ?? '–'} d | ${r.contributors ?? '–'} |`);
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const reportPath = typeof flags.report === 'string' ? flags.report : 'health-report.md';
  const generatedAt = new Date().toISOString();
  const rows = [];
  const snapshot = { generated_at: generatedAt.slice(0, 10), repos: {} };

  for (const { data } of await readAllCategoryFiles()) {
    for (const e of data.entries) {
      const check = await checkRepo(e.id, e);
      const ev = check.evaluation;
      rows.push({
        id: e.id,
        category: data.category,
        pass: ev.pass,
        maintainer_pick: ev.maintainer_pick,
        reasons: ev.reasons,
        warnings: ev.warnings,
        renamed: check.renamed,
        full_name: check.full_name,
        stars: check.signals?.stars,
        days_since_push: ev.days_since_push,
        contributors: check.contributors,
      });
      if (check.found) snapshot.repos[e.id] = { ...check.signals, contributors: check.contributors, pass: ev.pass, ...(ev.maintainer_pick ? { maintainer_pick: true } : {}) };
    }
  }

  await writeFile(reportPath, renderReport(rows, generatedAt));
  await mkdir(`${CATALOG_DIR}.cache`, { recursive: true });
  await writeFile(`${CATALOG_DIR}.cache/stats.json`, JSON.stringify(snapshot, null, 2) + '\n');
  const failing = rows.filter((r) => !r.pass).length;
  process.stdout.write(JSON.stringify({ ok: true, entries: rows.length, failing, report: reportPath }, null, 2) + '\n');
}

if (process.argv[1] && process.argv[1].endsWith('health.mjs')) main();
