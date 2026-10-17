#!/usr/bin/env node
// Find catalog candidates (SPEC §8.5). Runs each category's GitHub queries with the quality
// floor built in (≥ 1,000 stars, pushed within 6 months, not archived), drops repos already in
// the catalog, and optionally runs the full quality check (contributors, fake stars, license).
// Usage: node scripts/scout.mjs (--category <slug> | --all) [--check] [--limit 30]
//          [--big] [--exclude ids.txt] [--json candidates.json] [--report scout-report.md]
// --big is the safety net: every repo with ≥ 10,000 stars, by topic AND by keywords in
// name/description, so popular repos without topic tags are not missed.
// Used weekly for new candidates, and once to harvest the initial catalog.
import { readFile, writeFile } from 'node:fs/promises';
import { intFlag, parseArgs } from '../skills/check-before-you-build/scripts/lib/cli.mjs';
import { searchRepos } from '../skills/check-before-you-build/scripts/github.mjs';
import { RULES, statusLabel } from '../skills/check-before-you-build/scripts/lib/criteria.mjs';
import { readAllCategoryFiles, readCategories } from './lib/catalog-files.mjs';
import { checkRepo } from './lib/repo-check.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHECK_CONCURRENCY = 6; // core API allows 5,000 requests/hour; searches stay sequential

/** Run `fn` over `items` with at most `limit` in flight. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export const BIG_REPO_STARS = 10000;

export function qualityQualifiers(now = Date.now(), minStars = RULES.stars.solid) {
  const since = new Date(now - RULES.freshness_days.ok * 86400000).toISOString().slice(0, 10);
  return `stars:>=${minStars} pushed:>=${since} archived:false`;
}

/**
 * Queries for a category. Normal mode uses the topic queries. Big-repo mode (the safety net)
 * also searches the same words in names and descriptions, because many popular repos never set
 * the topic tags (that is how repos like morluto/rea were missed).
 */
export function categoryQueries(cat, { big = false } = {}) {
  if (!big) return cat.queries;
  const keywordVariants = cat.queries.map(
    (q) => `${q.replace(/topic:([\w-]+)/g, (_, t) => t.replace(/-/g, ' '))} in:name,description`,
  );
  return [...new Set([...cat.queries, ...keywordVariants])];
}

export function renderReport(byCategory, generatedAt) {
  const lines = [`# Scout report`, '', `${generatedAt.slice(0, 10)}`, ''];
  for (const [slug, candidates] of Object.entries(byCategory)) {
    lines.push(`## ${slug} (${candidates.length})`, '');
    if (!candidates.length) {
      lines.push('_No new candidates._', '');
      continue;
    }
    lines.push('| Repo | Stars | Last push | Status | Description |', '|---|---|---|---|---|');
    for (const c of candidates) {
      const tier = statusLabel(c.evaluation);
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
  if (typeof flags.exclude === 'string') {
    // extra ids to treat as already present (e.g. a staged selection not yet written to the catalog)
    for (const id of (await readFile(flags.exclude, 'utf8')).split(/\s+/).filter(Boolean)) existing.add(id.toLowerCase());
  }
  const big = Boolean(flags.big);
  const qualifiers = qualityQualifiers(Date.now(), big ? BIG_REPO_STARS : RULES.stars.solid);
  const limit = intFlag(flags, 'limit', 30);
  const byCategory = {};
  const failures = [];

  for (const cat of targets) {
    const found = new Map();
    for (const query of categoryQueries(cat, { big })) {
      try {
        const res = await searchRepos([query, qualifiers], { limit, minStars: 0, sort: big ? 'stars' : undefined });
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
      await mapLimit(candidates, CHECK_CONCURRENCY, async (c) => {
        try {
          const check = await checkRepo(c.full_name);
          c.contributors = check.contributors;
          c.evaluation = check.evaluation;
        } catch (err) {
          c.evaluation = { pass: false, reasons: [`check failed: ${err.message}`], warnings: [] };
        }
      });
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
