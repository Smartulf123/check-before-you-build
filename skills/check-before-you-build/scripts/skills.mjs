#!/usr/bin/env node
// skills.sh: agent skill search with install counts. The endpoint is undocumented, so a
// failure is reported as a failed source, never as "no skills exist" (sources-findings.md).
import { fetchJson } from './lib/http.mjs';
import { intFlag, isMain, runCli } from './lib/cli.mjs';

const USAGE = `skills.mjs <command>
  search <keywords...> [--limit 30]   multi-word = semantic search, single word = fuzzy; no descriptions`;

export function mapSkill(s) {
  return {
    id: `skills:${s.id}`,
    name: s.name,
    url: `https://skills.sh/${s.id}`,
    source: 'skills.sh',
    github: s.source || null,
    signals: { installs: s.installs ?? 0 },
  };
}

export async function searchSkills(keywords, { limit = 30 } = {}) {
  const text = keywords.join(' ').trim();
  if (!text) throw new Error('search needs at least one keyword');
  const { data } = await fetchJson(`https://skills.sh/api/search?q=${encodeURIComponent(text)}`);
  if (!Array.isArray(data?.skills)) throw new Error('unexpected skills.sh response shape (endpoint may have changed)');
  return {
    source: 'skills.sh',
    query: text,
    search_type: data.searchType || null,
    results: data.skills.slice(0, limit).map(mapSkill),
  };
}

if (isMain(import.meta.url)) {
  runCli({ search: (args, flags) => searchSkills(args, { limit: intFlag(flags, 'limit', 30) }) }, USAGE);
}
