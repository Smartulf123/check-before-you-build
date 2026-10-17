#!/usr/bin/env node
// Curated catalog lookup (SPEC §8). Entries live next to this skill so installed copies have them.
// Stored fields rarely change; live stats come from GitHub (--live), falling back to the weekly
// snapshot in catalog/.cache/stats.json.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { intFlag, isMain, runCli } from './lib/cli.mjs';
import { tokenize } from './plugins.mjs';
import { getRepo } from './github.mjs';

const CATALOG_DIR = fileURLToPath(new URL('../catalog/', import.meta.url));

const USAGE = `catalog.mjs <command>
  categories                                         list category slugs
  search [keywords...] [--categories a,b] [--kinds skill,mcp] [--limit 15] [--live]
  get <owner/repo> [--live]`;

export async function loadCategories(dir = CATALOG_DIR) {
  return JSON.parse(await readFile(`${dir}categories.json`, 'utf8')).categories;
}

export async function loadEntries(dir = CATALOG_DIR) {
  const entriesDir = `${dir}entries/`;
  if (!existsSync(entriesDir)) return [];
  const files = (await readdir(entriesDir)).filter((f) => f.endsWith('.json'));
  const entries = [];
  for (const file of files) {
    const parsed = JSON.parse(await readFile(entriesDir + file, 'utf8'));
    entries.push(...(Array.isArray(parsed) ? parsed : parsed.entries || []));
  }
  return entries;
}

async function loadSnapshot(dir = CATALOG_DIR) {
  try {
    return JSON.parse(await readFile(`${dir}.cache/stats.json`, 'utf8'));
  } catch {
    return null;
  }
}

/** Score entries: category match is a filter; keyword hits in name/tags count double. */
export function searchEntries(entries, { keywords = [], categories = [], kinds = [], limit = 15 } = {}) {
  const terms = [...new Set(tokenize(keywords.join(' ')))];
  return entries
    .filter((e) => !categories.length || categories.includes(e.category) || (e.subcategories || []).some((s) => categories.includes(s)))
    .filter((e) => !kinds.length || (e.kinds || []).some((k) => kinds.includes(k)))
    .map((e) => {
      const strong = tokenize(`${e.name} ${(e.tags || []).join(' ')}`);
      const weak = tokenize(`${e.use_for} ${e.why}`);
      const score = terms.reduce((sum, t) => sum + (strong.includes(t) ? 2 : 0) + (weak.includes(t) ? 1 : 0), 0);
      return { e, score };
    })
    .filter((x) => !terms.length || x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ e, score }) => ({ ...toResult(e), match_score: score }));
}

export function toResult(e) {
  return {
    id: `github:${e.id}`,
    name: e.name,
    url: `https://github.com/${e.id}`,
    source: 'catalog',
    from_catalog: true,
    category: e.category,
    kinds: e.kinds || [],
    tags: e.tags || [],
    use_for: e.use_for,
    why: e.why,
    alternatives: e.alternatives || [],
    signals: {},
  };
}

async function withLiveStats(results, live) {
  const snapshot = await loadSnapshot();
  for (const r of results) {
    const repoId = r.id.replace(/^github:/, '');
    if (live) {
      try {
        const res = await getRepo(repoId);
        if (res.found) {
          r.signals = res.result.signals;
          r.stats_source = 'live';
          continue;
        }
        r.signals = { missing: true };
        r.stats_source = 'live';
        continue;
      } catch {
        // fall through to the snapshot
      }
    }
    if (snapshot?.repos?.[repoId]) {
      r.signals = snapshot.repos[repoId];
      r.stats_source = `snapshot ${snapshot.generated_at}`;
    }
  }
  return results;
}

const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

if (isMain(import.meta.url)) {
  runCli(
    {
      categories: async () => ({ source: 'catalog', results: await loadCategories() }),
      search: async (args, flags) => {
        const entries = await loadEntries();
        const results = searchEntries(entries, {
          keywords: args,
          categories: list(flags.categories),
          kinds: list(flags.kinds),
          limit: intFlag(flags, 'limit', 15),
        });
        return { source: 'catalog', catalog_size: entries.length, results: await withLiveStats(results, Boolean(flags.live)) };
      },
      get: async ([id], flags) => {
        const entry = (await loadEntries()).find((e) => e.id.toLowerCase() === String(id).toLowerCase());
        if (!entry) return { source: 'catalog', found: false, id: `github:${id}` };
        return { source: 'catalog', found: true, result: (await withLiveStats([toResult(entry)], Boolean(flags.live)))[0] };
      },
    },
    USAGE,
  );
}
