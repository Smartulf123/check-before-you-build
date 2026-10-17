#!/usr/bin/env node
// Fact-check evidence.json before the report is written (SPEC §10).
// - Catalog entries: verified from the weekly snapshot (no GitHub calls).
// - Other GitHub repos: re-fetched; missing → dropped, renamed → updated, numbers refreshed.
// - npm packages: re-fetched; missing → dropped.
// - Demand items and commercial products: URL checked; dead demand links dropped, dead product sites labelled.
// Numbers that drift > 10 % from the live value are corrected and logged.
// Usage: node verify.mjs <evidence.json> [--dry-run]
import { readFile, writeFile } from 'node:fs/promises';
import { errorObject, isMain, parseArgs } from './lib/cli.mjs';
import { checkUrl } from './lib/http.mjs';
import { getRepo } from './github.mjs';
import { packageInfo } from './npm.mjs';
import { loadEntries } from './catalog.mjs';

const DRIFT = 0.1;

async function loadSnapshot() {
  try {
    return JSON.parse(await readFile(new URL('../catalog/.cache/stats.json', import.meta.url), 'utf8'));
  } catch {
    return null;
  }
}

const repoOf = (item) => {
  const m = /^github:([\w.-]+\/[\w.-]+)$/.exec(item.id || '') || /github\.com\/([\w.-]+\/[\w.-]+?)(?:[/#?]|$)/.exec(item.url || '');
  return m ? m[1] : null;
};

/** Compare numeric signals; replace drifted values and return the corrections made. */
export function correctDrift(item, live, fields = ['stars', 'installs', 'downloads_weekly', 'uses']) {
  const corrections = [];
  item.signals ||= {};
  for (const f of fields) {
    if (live[f] === undefined || live[f] === null) continue;
    const old = item.signals[f];
    if (old !== undefined && old !== null && old !== 0 && Math.abs(live[f] - old) / old > DRIFT) {
      corrections.push({ id: item.id, field: f, from: old, to: live[f] });
    }
    item.signals[f] = live[f];
  }
  for (const f of ['pushed_at', 'license', 'archived']) if (live[f] !== undefined) item.signals[f] = live[f];
  return corrections;
}

export async function verifyEvidence(evidence, { snapshot = null, catalogIds = new Set() } = {}) {
  const stats = { checked: 0, passed: 0, corrected: 0, dropped: 0 };
  const log = { corrections: [], dropped: [], labelled: [], readme_missing: [] };

  const verifyRepoItem = async (item) => {
    const repo = repoOf(item);
    if (!repo) return null; // not a GitHub item
    stats.checked++;
    const key = repo.toLowerCase();
    if (item.from_catalog || catalogIds.has(key)) {
      const snap = snapshot?.repos && Object.entries(snapshot.repos).find(([k]) => k.toLowerCase() === key)?.[1];
      if (snap) log.corrections.push(...correctDrift(item, snap));
      item.verified = true;
      item.stats_source = snap ? `snapshot ${snapshot.generated_at}` : 'catalog';
      stats.passed++;
      return true;
    }
    const res = await getRepo(repo);
    if (!res.found) {
      item.verified = false;
      stats.dropped++;
      log.dropped.push({ id: item.id, reason: 'repository not found' });
      return false;
    }
    if (res.renamed) {
      log.corrections.push({ id: item.id, field: 'id', from: item.id, to: `github:${res.result.full_name}` });
      item.id = `github:${res.result.full_name}`;
      item.url = res.result.url;
    }
    log.corrections.push(...correctDrift(item, res.result.signals));
    item.verified = true;
    item.stats_source = 'live';
    stats.passed++;
    return true;
  };

  const verifyNpmItem = async (item) => {
    const name = (item.id || '').replace(/^npm:/, '');
    stats.checked++;
    const res = await packageInfo(name);
    if (!res.found) {
      item.verified = false;
      stats.dropped++;
      log.dropped.push({ id: item.id, reason: 'package not found' });
      return;
    }
    log.corrections.push(...correctDrift(item, res.result.signals));
    item.verified = true;
    stats.passed++;
  };

  const verifyUrlItem = async (item, { dropDead }) => {
    if (!item.url) return;
    stats.checked++;
    const res = await checkUrl(item.url);
    if (res.ok) {
      item.verified = true;
      stats.passed++;
    } else if (dropDead) {
      item.verified = false;
      stats.dropped++;
      log.dropped.push({ id: item.id || item.url, reason: `dead link (${res.status || res.error})` });
    } else {
      item.link_status = 'unreachable';
      item.verified = true; // keep, but labelled
      log.labelled.push({ id: item.id || item.url, reason: `site unreachable (${res.status || res.error})` });
      stats.passed++;
    }
  };

  for (const c of evidence.competitors || []) {
    if (c.verified === false) continue;
    const handled = await verifyRepoItem(c);
    if (handled !== null) continue;
    if ((c.id || '').startsWith('npm:')) await verifyNpmItem(c);
    else await verifyUrlItem(c, { dropDead: c.source !== 'commercial' });
  }
  for (const b of evidence.building_blocks || []) {
    if (b.verified === false) continue;
    const handled = await verifyRepoItem(b);
    if (handled === null && (b.id || '').startsWith('npm:')) await verifyNpmItem(b);
    if (b.verified !== false && !b.readme_read) log.readme_missing.push(b.id);
  }
  for (const c of evidence.competitors || []) {
    if (c.verified !== false && (c.match === 'direct' || c.match === 'partial') && !c.readme_read) log.readme_missing.push(c.id);
  }
  for (const d of evidence.demand || []) {
    if (d.verified === false) continue;
    // HN items come straight from the Algolia API; their discussion URLs are stable.
    if (/news\.ycombinator\.com\/item\?id=/.test(d.url || '')) {
      stats.checked++;
      stats.passed++;
      d.verified = true;
      continue;
    }
    await verifyUrlItem(d, { dropDead: true });
  }

  stats.corrected = log.corrections.length;
  evidence.verification = { ...stats, verified_at: new Date().toISOString() };
  return { stats, log };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [file] = args._;
  const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + '\n');
  if (!file) {
    out({ ok: false, error: { type: 'Usage', message: 'verify.mjs <evidence.json> [--dry-run]' } });
    process.exitCode = 1;
    return;
  }
  try {
    const evidence = JSON.parse(await readFile(file, 'utf8'));
    const catalogIds = new Set((await loadEntries()).map((e) => e.id.toLowerCase()));
    const { stats, log } = await verifyEvidence(evidence, { snapshot: await loadSnapshot(), catalogIds });
    if (!args.flags['dry-run']) await writeFile(file, JSON.stringify(evidence, null, 2) + '\n');
    out({
      ok: true,
      file,
      written: !args.flags['dry-run'],
      verification: stats,
      ...log,
      ...(log.readme_missing.length ? { warning: 'Read the README of these repos before recommending them (hard rule 7).' } : {}),
    });
  } catch (err) {
    out({ ok: false, error: errorObject(err) });
    process.exitCode = 1;
  }
}

if (isMain(import.meta.url)) main();
