#!/usr/bin/env node
// Claude plugins: downloads the official marketplace manifest once (cached) and matches
// keywords locally against name, description and category. Community plugins are covered
// by GitHub repo search and skills.sh instead (sources-findings.md).
import { fetchJson } from './lib/http.mjs';
import { intFlag, isMain, runCli } from './lib/cli.mjs';

const MARKETPLACE_REPO = 'anthropics/claude-plugins-official';
const MARKETPLACE_URL = `https://raw.githubusercontent.com/${MARKETPLACE_REPO}/main/.claude-plugin/marketplace.json`;

const USAGE = `plugins.mjs <command>
  search <keywords...> [--limit 20]   matches the official Claude plugin marketplace locally`;

const STOPWORDS = new Set(['a', 'an', 'the', 'for', 'and', 'or', 'to', 'of', 'in', 'with', 'from', 'into', 'on']);

export function tokenize(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export function pluginUrl(p) {
  if (p.homepage) return p.homepage;
  const src = typeof p.source === 'string' ? p.source : p.source?.path || p.source?.url;
  if (typeof src === 'string' && src.startsWith('http')) return src;
  if (typeof src === 'string') return `https://github.com/${MARKETPLACE_REPO}/tree/main/${src.replace(/^\.\//, '')}`;
  if (p.source?.repo) return `https://github.com/${p.source.repo}`;
  return `https://github.com/${MARKETPLACE_REPO}`;
}

/** Score = number of keyword hits; name hits count double. */
export function matchPlugins(plugins, keywords, limit = 20) {
  const terms = [...new Set(tokenize(keywords.join(' ')))];
  if (!terms.length) return [];
  return plugins
    .map((p) => {
      const name = tokenize(p.name);
      const body = tokenize(`${p.description || ''} ${p.category || ''}`);
      const score = terms.reduce((sum, t) => sum + (name.includes(t) ? 2 : 0) + (body.includes(t) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p, score }) => ({
      id: `plugin:${p.name}`,
      name: p.name,
      url: pluginUrl(p),
      source: 'claude-plugins-official',
      description: p.description || '',
      category: p.category || null,
      match_score: score,
      signals: {},
    }));
}

export async function searchPlugins(keywords, { limit = 20 } = {}) {
  if (!keywords.join('').trim()) throw new Error('search needs at least one keyword');
  const { data } = await fetchJson(MARKETPLACE_URL);
  const plugins = data?.plugins || [];
  return {
    source: 'claude-plugins-official',
    query: keywords.join(' '),
    marketplace_size: plugins.length,
    results: matchPlugins(plugins, keywords, limit),
  };
}

if (isMain(import.meta.url)) {
  runCli({ search: (args, flags) => searchPlugins(args, { limit: intFlag(flags, 'limit', 20) }) }, USAGE);
}
