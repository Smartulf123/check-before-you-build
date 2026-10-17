#!/usr/bin/env node
// Draft (and optionally add) a catalog entry after a live quality check.
// Usage: node scripts/catalog-add.mjs <owner/repo> --category <slug>
//          [--name N] [--use-for "…"] [--why "…"] [--kinds library,cli] [--tags a,b]
//          [--npm pkg] [--skill owner/repo/skill] [--official] [--stable --stable-reason "…"]
//          [--license-verified SPDX --license-note "…"]   only after reading the license yourself
//          [--featured] [--write]
// Without --write it prints the draft only. It never writes an entry that fails the quality rules.
import { parseArgs } from '../skills/check-before-you-build/scripts/lib/cli.mjs';
import { checkRepo } from './lib/repo-check.mjs';
import { readCategories, readCategoryFile, today, writeCategoryFile } from './lib/catalog-files.mjs';

const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined);

export function licenseVerified(flags) {
  return {
    license: flags['license-verified'],
    ...(typeof flags['license-note'] === 'string' ? { note: flags['license-note'] } : {}),
    date: today(),
  };
}

export function draftEntry(check, flags, category) {
  const kinds = list(flags.kinds) || ['library'];
  return {
    id: check.full_name,
    name: flags.name || check.full_name.split('/')[1],
    category,
    kinds,
    tags: list(flags.tags) || (check.topics || []).slice(0, 6),
    use_for: flags['use-for'] || (check.description || '').slice(0, 140),
    why: flags.why || 'TODO: one line on why it is recommended',
    ...(flags.npm ? { npm: flags.npm } : {}),
    ...(flags.skill ? { skill: flags.skill } : {}),
    ...(flags.official ? { official: true } : {}),
    ...(flags.featured ? { featured: true } : {}),
    ...(flags.stable ? { stable: true, stable_reason: flags['stable-reason'] } : {}),
    ...(flags['license-verified'] ? { license_verified: licenseVerified(flags) } : {}),
    added: today(),
    last_reviewed: today(),
  };
}

async function main() {
  const { _: [id], flags } = parseArgs(process.argv.slice(2));
  const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + '\n');
  if (!id || typeof flags.category !== 'string') {
    out({ ok: false, error: { type: 'Usage', message: 'catalog-add.mjs <owner/repo> --category <slug> [--write] (see file header)' } });
    process.exitCode = 1;
    return;
  }
  const { categories } = await readCategories();
  if (!categories.some((c) => c.slug === flags.category)) {
    out({ ok: false, error: { type: 'Usage', message: `unknown category ${flags.category}` } });
    process.exitCode = 1;
    return;
  }

  const check = await checkRepo(id, {
    npm: flags.npm,
    skill: flags.skill,
    official: Boolean(flags.official),
    stable: Boolean(flags.stable),
    stable_reason: flags['stable-reason'],
    license_verified: flags['license-verified'] ? licenseVerified(flags) : undefined,
  });
  if (!check.found || !check.evaluation.pass) {
    out({ ok: false, id, evaluation: check.evaluation, error: { type: 'QualityRules', message: 'does not meet the catalog quality rules' } });
    process.exitCode = 1;
    return;
  }

  const entry = draftEntry(check, flags, flags.category);
  const file = await readCategoryFile(flags.category);
  const duplicate = file.entries.find((e) => e.id.toLowerCase() === entry.id.toLowerCase());
  if (flags.write) {
    if (duplicate) {
      out({ ok: false, id, error: { type: 'Duplicate', message: `${entry.id} is already in ${flags.category}` } });
      process.exitCode = 1;
      return;
    }
    if (entry.why.startsWith('TODO')) {
      out({ ok: false, id, draft: entry, error: { type: 'Incomplete', message: 'pass --why "…" before writing' } });
      process.exitCode = 1;
      return;
    }
    file.entries.push(entry);
    await writeCategoryFile(flags.category, file);
  }
  out({ ok: true, written: Boolean(flags.write), maintainer_pick: check.evaluation.maintainer_pick, freshness: check.evaluation.freshness, warnings: check.evaluation.warnings, signals: { ...check.signals, contributors: check.contributors }, entry });
}

if (process.argv[1] && process.argv[1].endsWith('catalog-add.mjs')) main();
