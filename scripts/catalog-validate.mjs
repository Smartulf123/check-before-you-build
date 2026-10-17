#!/usr/bin/env node
// Validate the catalog. Static checks always (schema, categories, duplicates, sizes).
// --live also re-checks every entry against the quality rules (GitHub API calls).
// Usage: node scripts/catalog-validate.mjs [--live]
import { parseArgs } from '../skills/check-before-you-build/scripts/lib/cli.mjs';
import { readAllCategoryFiles, readCategories } from './lib/catalog-files.mjs';
import { checkRepoPatient as checkRepo } from './lib/repo-check.mjs';

const KINDS = new Set(['library', 'framework', 'template', 'skill', 'plugin', 'mcp', 'cli', 'app', 'service', 'engine']);
const REQUIRED = ['id', 'name', 'category', 'kinds', 'tags', 'use_for', 'why', 'added', 'last_reviewed'];
const SIZE = { min: 5, max: 50 };
const MAX_FEATURED = 5;

export function validateStatic(files, categoriesDoc) {
  const errors = [];
  const warnings = [];
  const slugs = new Set(categoriesDoc.categories.map((c) => c.slug));
  const domains = new Set((categoriesDoc.domains || []).map((d) => d.slug));
  const seen = new Map();

  for (const { file, data } of files) {
    const slug = file.replace(/\.json$/, '');
    if (data.category !== slug) errors.push(`${file}: "category" must be "${slug}"`);
    if (!slugs.has(slug)) errors.push(`${file}: unknown category`);
    if (!Array.isArray(data.entries)) {
      errors.push(`${file}: "entries" must be an array`);
      continue;
    }
    const n = data.entries.length;
    if (n > SIZE.max) errors.push(`${file}: ${n} entries (max ${SIZE.max})`);
    if (n > 0 && n < SIZE.min) warnings.push(`${file}: only ${n} entries (target ≥ ${SIZE.min})`);
    const featured = data.entries.filter((e) => e.featured).length;
    if (featured > MAX_FEATURED) errors.push(`${file}: ${featured} featured entries (max ${MAX_FEATURED})`);
    if (n >= SIZE.min && featured === 0) warnings.push(`${file}: no featured entries`);

    data.entries.forEach((e, i) => {
      const where = `${file}[${i}] ${e.id || '?'}`;
      for (const key of REQUIRED) if (e[key] === undefined || e[key] === '') errors.push(`${where}: missing ${key}`);
      if (e.id && !/^[\w.-]+\/[\w.-]+$/.test(e.id)) errors.push(`${where}: id must be owner/repo`);
      if (e.category && e.category !== slug) errors.push(`${where}: category "${e.category}" ≠ file "${slug}"`);
      for (const k of e.kinds || []) if (!KINDS.has(k)) errors.push(`${where}: unknown kind "${k}"`);
      if (!(e.tags || []).length) errors.push(`${where}: needs at least one tag`);
      if ((e.use_for || '').length > 140) errors.push(`${where}: use_for over 140 chars`);
      if ((e.why || '').length > 200) errors.push(`${where}: why over 200 chars`);
      if ((e.why || '').startsWith('TODO')) errors.push(`${where}: why is still TODO`);
      if (e.stable && !e.stable_reason) errors.push(`${where}: stable needs stable_reason`);
      if (e.exception && (!(e.exception.rules || []).length || !e.exception.reason || !e.exception.date)) {
        errors.push(`${where}: exception needs rules, reason and date`);
      }
      if (e.license_verified && (!e.license_verified.license || !e.license_verified.date)) {
        errors.push(`${where}: license_verified needs license and date`);
      }
      for (const d of e.domains || []) if (!domains.has(d)) errors.push(`${where}: unknown domain "${d}"`);
      const key = (e.id || '').toLowerCase();
      if (seen.has(key)) errors.push(`${where}: duplicate of ${seen.get(key)}`);
      else seen.set(key, where);
    });
  }

  const allIds = new Set([...seen.keys()]);
  for (const { file, data } of files) {
    for (const e of data.entries || []) {
      for (const alt of e.alternatives || []) {
        if (!allIds.has(alt.toLowerCase())) warnings.push(`${file} ${e.id}: alternative ${alt} is not in the catalog`);
      }
    }
  }
  return { errors, warnings, total: seen.size };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const files = await readAllCategoryFiles();
  const result = validateStatic(files, await readCategories());
  const live = [];
  if (flags.live) {
    for (const { data } of files) {
      for (const e of data.entries) {
        const check = await checkRepo(e.id, e);
        if (!check.found || !check.evaluation.pass) {
          result.errors.push(`${e.id}: fails quality rules: ${check.evaluation.reasons.join('; ')}`);
        }
        if (check.renamed) result.warnings.push(`${e.id}: renamed to ${check.full_name}`);
        live.push({ id: e.id, pass: check.evaluation.pass, freshness: check.evaluation.freshness });
      }
    }
  }
  const ok = result.errors.length === 0;
  process.stdout.write(JSON.stringify({ ok, total: result.total, errors: result.errors, warnings: result.warnings, ...(flags.live ? { live } : {}) }, null, 2) + '\n');
  process.exitCode = ok ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith('catalog-validate.mjs')) main();
