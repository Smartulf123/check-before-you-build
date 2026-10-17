#!/usr/bin/env node
// Hacker News via the Algolia API: stories, Show HN and Ask HN posts with points and dates.
import { fetchJson } from './lib/http.mjs';
import { intFlag, isMain, runCli } from './lib/cli.mjs';

const USAGE = `hn.mjs <command>
  search <keywords...> [--limit 20] [--tags story|show_hn|ask_hn|comment] [--since YYYY-MM-DD] [--by-date]`;

export function mapHit(h) {
  return {
    id: `hn:${h.objectID}`,
    title: h.title || h.story_title || '',
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    link: h.url || null,
    source: 'hn',
    points: h.points ?? 0,
    comments: h.num_comments ?? 0,
    date: (h.created_at || '').slice(0, 10),
    text: h.comment_text ? h.comment_text.replace(/<[^>]+>/g, '').slice(0, 300) : undefined,
  };
}

export function buildSearchUrl(text, { limit = 20, tags = 'story', since, byDate = false } = {}) {
  const params = new URLSearchParams({ query: text, tags, hitsPerPage: String(Math.min(limit, 100)) });
  if (since) {
    const ts = Math.floor(new Date(since).getTime() / 1000);
    if (!Number.isFinite(ts)) throw new Error('--since must be YYYY-MM-DD');
    params.set('numericFilters', `created_at_i>${ts}`);
  }
  return `https://hn.algolia.com/api/v1/${byDate ? 'search_by_date' : 'search'}?${params}`;
}

export async function searchHn(keywords, options = {}) {
  const text = keywords.join(' ').trim();
  if (!text) throw new Error('search needs at least one keyword');
  const { data } = await fetchJson(buildSearchUrl(text, options));
  return { source: 'hn', query: text, total: data.nbHits, results: (data.hits || []).map(mapHit) };
}

if (isMain(import.meta.url)) {
  runCli(
    {
      search: (args, flags) =>
        searchHn(args, {
          limit: intFlag(flags, 'limit', 20),
          tags: typeof flags.tags === 'string' ? flags.tags : 'story',
          since: typeof flags.since === 'string' ? flags.since : undefined,
          byDate: Boolean(flags['by-date']),
        }),
    },
    USAGE,
  );
}
