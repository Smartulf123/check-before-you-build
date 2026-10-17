#!/usr/bin/env node
// Find catalog candidates (SPEC §8.5). Runs each category's GitHub queries with the quality
// floor built in (≥ 1,000 stars, pushed within 6 months, not archived), drops repos already in
// the catalog, and optionally runs the full quality check (contributors, fake stars, license).
// Usage: node scripts/scout.mjs (--category <slug> | --all) [--check] [--limit 30]
//          [--json candidates.json] [--report scout-report.md]
// Used weekly for new candidates, and once to harvest the initial catalog.
import { writeFile } from 'node:fs/promises';
import { intFlag, parseArgs } from '../skills/check-before-you-build/scripts/lib/cli.mjs';
import { searchRepos } from '../skills/check-before-you-build/scripts/github.mjs';
import { RULES, TIER_LABEL } from '../skills/check-before-you-build/scripts/lib/criteria.mjs';
import { readAllCategoryFiles, readCategories } from './lib/catalog-files.mjs';
import { checkRepo } from './lib/repo-check.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function qualityQualifiers(now = Date.now()) {
  const since = new Date(now - RULES.freshness_days.ok * 86400000).toISOString().slice(0, 10);
  return `stars:>=${RULES.stars.solid} pushed:>=${since} archived:false`;
}

export function renderReport(byCategory, generatedAt) {
  const lines = [`# Scout report`, '', `${generatedAt.slice(0, 10)}`, ''];
  for (const [slug, candidates] of Object.entries(byCategory)) {
    lines.push(`## ${slug} (${candidates.length})`, '');
    if (!candidates.length) {
      lines.push('_No new candidates._', '');
      continue;
    }
    lines.push('| Repo | Stars | Last push | Tier | Description |', '|---|---|---|---|---|');
    for (const c of candidates) {
      const tier = c.evaluation ? (c.evaluation.pass ? TIER_LABEL[c.evaluation.tier] : `❌ ${c.evaluation.reasons[0]}`) : '(unchecked)';
      lines.push(`| [${c.full_name}](${c.url}) | ${c.signals.stars} | ${(c.signals.pushed_at || '').slice(0, 10)} | ${tier} | ${(c.description || '').replace(/\|/g, '/').slice(0, 100)} |`);
    }
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const { categories } = await readCategories();
  const targets = flags.all ? categories : categories.filter((c) => c.slug === flags.category);
  if (!targets.length) {
    process.stdout.write(JSON.stringify({ ok: false, error: { type: 'Usage', message: 'scout.mjs (--category <slug> | --all) [--check]' } }, null, 2) + '\n');
    process.exitCode = 1;
    return;
  }
  const existing = new Set((await readAllCategoryFiles()).flatMap(({ data }) => data.entries.map((e) => e.id.toLowerCase())));
  const qualifiers = qualityQualifiers();
  const limit = intFlag(flags, 'limit', 30);
  const byCategory = {};
  const failures = [];

  for (const cat of targets) {
    const found = new Map();
    for (const query of cat.queries) {
      try {
        const res = await searchRepos([query, qualifiers], { limit, minStars: 0 });
        for (const r of res.results) {
          const key = r.full_name.toLowerCase();
          if (!existing.has(key) && !found.has(key)) found.set(key, { ...r, matched_query: query });
        }
      } catch (err) {
        failures.push({ category: cat.slug, query, error: err.message });
        if (err.name === 'RateLimitError') await sleep(60_000);
      }
      await sleep(2100); // stay under 30 searches/minute
    }
    const candidates = [...found.values()].sort((a, b) => b.signals.stars - a.signals.stars);
    if (flags.check) {
      for (const c of candidates) {
        const check = await checkRepo(c.full_name);
        c.contributors = check.contributors;
        c.evaluation = check.evaluation;
      }
    }
    byCategory[cat.slug] = candidates;
    process.stderr.write(`scout: ${cat.slug} → ${candidates.length} candidates\n`);
  }

  const generatedAt = new Date().toISOString();
  const reportPath = typeof flags.report === 'string' ? flags.report : 'scout-report.md';
  await writeFile(reportPath, renderReport(byCategory, generatedAt));
  if (typeof flags.json === 'string') await writeFile(flags.json, JSON.stringify({ generated_at: generatedAt, byCategory }, null, 2) + '\n');
  const total = Object.values(byCategory).reduce((n, c) => n + c.length, 0);
  process.stdout.write(JSON.stringify({ ok: true, categories: targets.length, candidates: total, failures, report: reportPath }, null, 2) + '\n');
}

if (process.argv[1] && process.argv[1].endsWith('scout.mjs')) main();
