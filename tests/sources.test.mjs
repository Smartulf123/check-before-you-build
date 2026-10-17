import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, mockFetch } from './helpers.mjs';

const github = await load('github.mjs');
const npm = await load('npm.mjs');
const pypi = await load('pypi.mjs');
const mcp = await load('mcp.mjs');
const skills = await load('skills.mjs');
const plugins = await load('plugins.mjs');
const hn = await load('hn.mjs');

const repoFixture = {
  full_name: 'dembrandt/dembrandt',
  name: 'dembrandt',
  html_url: 'https://github.com/dembrandt/dembrandt',
  description: 'Extract design tokens',
  topics: ['design-tokens'],
  stargazers_count: 3656,
  forks_count: 319,
  pushed_at: '2026-10-11T16:34:11Z',
  created_at: '2025-01-01T00:00:00Z',
  license: { spdx_id: 'MIT' },
  archived: false,
  open_issues_count: 2,
};

test('github: search adds stars filter and maps repos', async () => {
  const calls = mockFetch([['search/repositories', { json: { total_count: 1, items: [repoFixture] } }]]);
  const out = await github.searchRepos(['extract', 'design', 'system'], { limit: 5 });
  assert.match(decodeURIComponent(calls[0]), /extract design system stars:>20/);
  assert.equal(out.results[0].id, 'github:dembrandt/dembrandt');
  assert.equal(out.results[0].signals.stars, 3656);
  assert.equal(out.results[0].signals.license, 'MIT');
  assert.equal(out.authenticated, false);
});

test('github: buildSearchQuery keeps an explicit stars filter and rejects empty input', () => {
  assert.equal(github.buildSearchQuery(['a', 'stars:>500'], 20), 'a stars:>500');
  assert.equal(github.buildSearchQuery(['topic:design-tokens'], 0), 'topic:design-tokens');
  assert.throws(() => github.buildSearchQuery([], 20));
});

test('github: repo returns found:false on 404 and detects renames', async () => {
  mockFetch([['repos/gone/repo', { status: 404 }]]);
  assert.deepEqual(await github.getRepo('gone/repo'), { source: 'github', found: false, id: 'github:gone/repo' });

  mockFetch([['repos/old/name', { json: repoFixture }]]);
  const renamed = await github.getRepo('old/name');
  assert.equal(renamed.renamed, true);
  assert.equal(renamed.result.full_name, 'dembrandt/dembrandt');
});

test('github: issues are mapped with reaction counts', async () => {
  mockFetch([['search/issues', { json: { total_count: 1, items: [{ number: 7, title: 'Add motion', html_url: 'u', created_at: 'd', comments: 3, reactions: { '+1': 12 } }] } }]]);
  const out = await github.getIssues('a/b');
  assert.equal(out.results[0].reactions_plus1, 12);
});

test('github: rate limit surfaces as RateLimitError with reset time', async () => {
  mockFetch([['search/repositories', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '4102444800' } }]]);
  await assert.rejects(github.searchRepos(['x']), (err) => err.name === 'RateLimitError' && err.resetAt.startsWith('2100'));
});

test('npm: search maps downloads and GitHub repo', async () => {
  mockFetch([['-/v1/search', { json: { total: 1, objects: [{ downloads: { weekly: 4415 }, package: { name: 'dembrandt', version: '0.39.2', description: 'd', date: '2026', license: 'MIT', links: { npm: 'https://www.npmjs.com/package/dembrandt', repository: 'git+https://github.com/dembrandt/dembrandt.git' } } }] } }]]);
  const out = await npm.searchPackages(['dembrandt']);
  assert.equal(out.results[0].signals.downloads_weekly, 4415);
  assert.equal(out.results[0].github, 'dembrandt/dembrandt');
});

test('npm: githubFromRepoUrl handles common URL shapes', () => {
  assert.equal(npm.githubFromRepoUrl('git+https://github.com/a/b.git'), 'a/b');
  assert.equal(npm.githubFromRepoUrl('https://github.com/a/b/tree/main'), 'a/b');
  assert.equal(npm.githubFromRepoUrl('git@github.com:a/b.git'), 'a/b');
  assert.equal(npm.githubFromRepoUrl('https://gitlab.com/a/b'), null);
});

test('npm: info combines metadata and downloads; missing package → found:false', async () => {
  mockFetch([
    ['registry.npmjs.org/dembrandt/latest', { json: { name: 'dembrandt', version: '1', license: 'MIT', repository: { url: 'git+https://github.com/dembrandt/dembrandt.git' } } }],
    ['downloads/point/last-week/dembrandt', { json: { downloads: 4415 } }],
  ]);
  const out = await npm.packageInfo('dembrandt');
  assert.equal(out.result.signals.downloads_weekly, 4415);
  assert.equal(out.result.signals.license, 'MIT');

  mockFetch([['registry.npmjs.org/nope/latest', { status: 404 }]]);
  assert.equal((await npm.packageInfo('nope')).found, false);
});

test('pypi: license falls back to classifiers', () => {
  assert.equal(pypi.pickLicense({ license_expression: 'Apache-2.0' }), 'Apache-2.0');
  assert.equal(pypi.pickLicense({ license: '', classifiers: ['License :: OSI Approved :: MIT License'] }), 'MIT License');
  const mapped = pypi.mapInfo({ name: 'x', version: '1', summary: 's', project_urls: { Source: 'https://github.com/o/x' } });
  assert.equal(mapped.github, 'o/x');
});

test('mcp: combines Smithery and official registry, dedupes, reports per-source status', async () => {
  mockFetch([
    ['registry.smithery.ai', { json: { servers: [{ qualifiedName: 'a/reddit', displayName: 'reddit', description: 'd', useCount: 333 }] } }],
    ['registry.modelcontextprotocol.io', { json: { servers: [{ server: { name: 'io.x/reddit', description: 'r', repository: { url: 'https://github.com/x/reddit' } } }] } }],
  ]);
  const out = await mcp.searchServers(['reddit', 'research']);
  assert.equal(out.sources_status.smithery, 'ok');
  assert.equal(out.sources_status.official, 'ok');
  assert.equal(out.results[0].signals.uses, 333);
  // two official terms (reddit, research) return the same server → deduped to one
  assert.equal(out.results.filter((r) => r.source === 'mcp-registry').length, 1);
});

test('mcp: a failing source is reported, not thrown', async () => {
  mockFetch([
    ['registry.smithery.ai', { status: 500 }],
    ['registry.modelcontextprotocol.io', { json: { servers: [] } }],
  ]);
  const out = await mcp.searchServers(['reddit']);
  assert.ok(out.sources_status.smithery.failed);
});

test('mcp: officialTerms keeps the longest words ≥ 4 chars', () => {
  assert.deepEqual(mcp.officialTerms(['a design system for web']), ['design', 'system']);
});

test('skills: maps installs and rejects unexpected response shapes', async () => {
  mockFetch([['skills.sh/api/search', { json: { searchType: 'semantic', skills: [{ id: 'o/r/s', source: 'o/r', skillId: 's', name: 's', installs: 9599 }] } }]]);
  const out = await skills.searchSkills(['reddit', 'research']);
  assert.equal(out.results[0].signals.installs, 9599);
  assert.equal(out.results[0].url, 'https://skills.sh/o/r/s');

  mockFetch([['skills.sh/api/search', { json: { changed: true } }]]);
  await assert.rejects(skills.searchSkills(['x']), /unexpected skills.sh response/);
});

test('plugins: name hits rank above description hits', () => {
  const list = [
    { name: 'pr-review-toolkit', description: 'tools', category: 'development', source: './plugins/pr' },
    { name: 'other', description: 'helps with pr review', category: 'misc', homepage: 'https://h' },
    { name: 'unrelated', description: 'nothing here' },
  ];
  const out = plugins.matchPlugins(list, ['pr review']);
  assert.deepEqual(out.map((p) => p.name), ['pr-review-toolkit', 'other']);
  assert.match(out[0].url, /claude-plugins-official\/tree\/main\/plugins\/pr$/);
  assert.equal(out[1].url, 'https://h');
});

test('hn: builds date filters and maps hits', async () => {
  const url = hn.buildSearchUrl('design tokens', { since: '2026-01-01', tags: 'show_hn', byDate: true });
  assert.match(url, /search_by_date\?/);
  assert.match(decodeURIComponent(url), /created_at_i>1767225600/);
  assert.throws(() => hn.buildSearchUrl('x', { since: 'not-a-date' }));

  mockFetch([['hn.algolia.com', { json: { nbHits: 1, hits: [{ objectID: '42', title: 'Show HN: X', points: 120, num_comments: 30, created_at: '2026-05-02T10:00:00Z', url: 'https://x.dev' }] } }]]);
  const out = await hn.searchHn(['x']);
  assert.equal(out.results[0].url, 'https://news.ycombinator.com/item?id=42');
  assert.equal(out.results[0].date, '2026-05-02');
});

test('skills.sh results carry a readme path for the skill folder', async () => {
  const { mapSkill } = await load('skills.mjs');
  assert.equal(mapSkill({ id: 'flutter/agent-plugins/a11y-audit', name: 'a11y-audit', source: 'flutter/agent-plugins', installs: 5 }).readme, 'flutter/agent-plugins/a11y-audit');
  assert.equal(mapSkill({ id: 'x', name: 'x', source: 'a/b' }).readme, 'a/b');
});
