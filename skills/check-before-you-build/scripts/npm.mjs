#!/usr/bin/env node
// npm: package search (results include downloads) and package info. Ranking is
// popularity-weighted, so the agent must judge relevance (sources-findings.md).
import { fetchJson } from './lib/http.mjs';
import { intFlag, isMain, runCli } from './lib/cli.mjs';

const USAGE = `npm.mjs <command>
  search <keywords...> [--limit 20]   results include weekly downloads
  info <package>                      license, repository, weekly downloads; found:false if missing`;

export function githubFromRepoUrl(url) {
  const m = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?].*)?$/.exec(url || '');
  return m ? `${m[1]}/${m[2]}` : null;
}

export function mapSearchObject(o) {
  const p = o.package;
  return {
    id: `npm:${p.name}`,
    name: p.name,
    url: p.links?.npm || `https://www.npmjs.com/package/${p.name}`,
    source: 'npm',
    description: p.description || '',
    github: githubFromRepoUrl(p.links?.repository),
    signals: {
      downloads_weekly: o.downloads?.weekly ?? null,
      version: p.version,
      published_at: p.date,
      license: p.license || null,
    },
  };
}

export async function searchPackages(keywords, { limit = 20 } = {}) {
  const text = keywords.join(' ').trim();
  if (!text) throw new Error('search needs at least one keyword');
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=${Math.min(limit, 250)}`;
  const { data } = await fetchJson(url);
  return { source: 'npm', query: text, total: data.total, results: (data.objects || []).map(mapSearchObject) };
}

export async function packageInfo(name) {
  if (!name) throw new Error('info needs a package name');
  const { status, data } = await fetchJson(`https://registry.npmjs.org/${name}/latest`);
  if (status === 404) return { source: 'npm', found: false, id: `npm:${name}` };
  const downloads = await fetchJson(`https://api.npmjs.org/downloads/point/last-week/${name}`);
  const repoUrl = typeof data.repository === 'string' ? data.repository : data.repository?.url;
  return {
    source: 'npm',
    found: true,
    result: {
      id: `npm:${data.name}`,
      name: data.name,
      url: `https://www.npmjs.com/package/${data.name}`,
      source: 'npm',
      description: data.description || '',
      github: githubFromRepoUrl(repoUrl),
      signals: {
        downloads_weekly: downloads.data?.downloads ?? null,
        version: data.version,
        license: typeof data.license === 'string' ? data.license : data.license?.type || null,
      },
    },
  };
}

if (isMain(import.meta.url)) {
  runCli(
    {
      search: (args, flags) => searchPackages(args, { limit: intFlag(flags, 'limit', 20) }),
      info: ([name]) => packageInfo(name),
    },
    USAGE,
  );
}
