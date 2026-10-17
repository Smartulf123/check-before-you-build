#!/usr/bin/env node
// GitHub: repo search, repo details, and issues sorted by 👍 (SPEC §7, sources-findings.md).
import { fetchJson } from './lib/http.mjs';
import { githubHeaders, isAuthenticated } from './lib/gh.mjs';
import { intFlag, isMain, runCli } from './lib/cli.mjs';

const API = 'https://api.github.com';

const USAGE = `github.mjs <command>
  search <keywords...> [--limit 20] [--min-stars 20]   2–4 unquoted keywords; topic:<slug> allowed
  repo <owner/repo>                                     live stats; found:false on 404
  issues <owner/repo> [--limit 10]                      open issues sorted by 👍
  contributors <owner/repo>                             contributor count`;

export function mapRepo(r) {
  return {
    id: `github:${r.full_name}`,
    name: r.name,
    full_name: r.full_name,
    url: r.html_url,
    source: 'github',
    description: r.description || '',
    topics: r.topics || [],
    signals: {
      stars: r.stargazers_count,
      forks: r.forks_count,
      pushed_at: r.pushed_at,
      created_at: r.created_at,
      license: r.license?.spdx_id || null,
      archived: Boolean(r.archived),
      open_issues: r.open_issues_count,
    },
  };
}

export function mapIssue(i) {
  return {
    number: i.number,
    title: i.title,
    url: i.html_url,
    created_at: i.created_at,
    comments: i.comments,
    reactions_plus1: i.reactions?.['+1'] ?? 0,
  };
}

export function buildSearchQuery(keywords, minStars) {
  const q = keywords.join(' ').trim();
  if (!q) throw new Error('search needs at least one keyword');
  return minStars > 0 && !/\bstars:/.test(q) ? `${q} stars:>${minStars}` : q;
}

export async function searchRepos(keywords, { limit = 20, minStars = 20 } = {}) {
  const q = buildSearchQuery(keywords, minStars);
  const url = `${API}/search/repositories?q=${encodeURIComponent(q)}&per_page=${Math.min(limit, 100)}`;
  const { data } = await fetchJson(url, { headers: githubHeaders() });
  return {
    source: 'github',
    query: q,
    authenticated: isAuthenticated(),
    total: data.total_count,
    results: (data.items || []).map(mapRepo),
  };
}

export async function getRepo(fullName) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(fullName || '')) throw new Error('expected owner/repo');
  const { status, data } = await fetchJson(`${API}/repos/${fullName}`, { headers: githubHeaders() });
  if (status === 404) return { source: 'github', found: false, id: `github:${fullName}` };
  return { source: 'github', found: true, renamed: data.full_name.toLowerCase() !== fullName.toLowerCase(), result: mapRepo(data) };
}

/** Total from a GitHub `Link` header when requesting per_page=1 (the last page number). */
export function countFromLink(link, itemsOnPage) {
  const last = /[?&]page=(\d+)>;\s*rel="last"/.exec(link || '');
  return last ? Number(last[1]) : itemsOnPage;
}

/** Number of contributors (anonymous included). One cheap request via pagination. */
export async function getContributorsCount(fullName) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(fullName || '')) throw new Error('expected owner/repo');
  const { status, data, link } = await fetchJson(`${API}/repos/${fullName}/contributors?per_page=1&anon=1`, {
    headers: githubHeaders(),
  });
  if (status === 404 || !Array.isArray(data)) return null;
  return countFromLink(link, data.length);
}

export async function getIssues(fullName, { limit = 10 } = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(fullName || '')) throw new Error('expected owner/repo');
  const q = `repo:${fullName} is:issue is:open`;
  const url = `${API}/search/issues?q=${encodeURIComponent(q)}&sort=reactions-%2B1&order=desc&per_page=${Math.min(limit, 50)}`;
  const { data } = await fetchJson(url, { headers: githubHeaders() });
  return { source: 'github', repo: fullName, total: data.total_count, results: (data.items || []).map(mapIssue) };
}

if (isMain(import.meta.url)) {
  runCli(
    {
      search: (args, flags) => searchRepos(args, { limit: intFlag(flags, 'limit', 20), minStars: intFlag(flags, 'min-stars', 20) }),
      repo: ([name]) => getRepo(name),
      issues: ([name], flags) => getIssues(name, { limit: intFlag(flags, 'limit', 10) }),
      contributors: async ([name]) => ({ source: 'github', repo: name, contributors: await getContributorsCount(name) }),
    },
    USAGE,
  );
}
