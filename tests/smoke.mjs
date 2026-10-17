#!/usr/bin/env node
// Live smoke test: hits every real source once. Not part of `npm test` (CI stays offline).
// Run: node tests/smoke.mjs
process.env.CBYB_NO_CACHE = '1';

const base = new URL('../skills/check-before-you-build/scripts/', import.meta.url);
const load = (name) => import(new URL(name, base));

const github = await load('github.mjs');
const npm = await load('npm.mjs');
const pypi = await load('pypi.mjs');
const mcp = await load('mcp.mjs');
const skills = await load('skills.mjs');
const plugins = await load('plugins.mjs');
const hn = await load('hn.mjs');

const checks = [
  ['github search', () => github.searchRepos(['extract', 'design', 'system', 'website'], { limit: 5 }), (r) => r.results.length > 0],
  ['github repo', () => github.getRepo('dembrandt/dembrandt'), (r) => r.found && r.result.signals.stars > 0],
  ['github repo 404', () => github.getRepo('nonexistent-zz/nope-zz'), (r) => r.found === false],
  ['github issues', () => github.getIssues('Manavarya09/design-extract', { limit: 3 }), (r) => Array.isArray(r.results)],
  ['npm search', () => npm.searchPackages(['design', 'tokens'], { limit: 3 }), (r) => r.results.length > 0],
  ['npm info', () => npm.packageInfo('dembrandt'), (r) => r.found && r.result.signals.downloads_weekly >= 0],
  ['pypi info', () => pypi.packageInfo('gpt-researcher'), (r) => r.found],
  ['mcp search', () => mcp.searchServers(['reddit', 'research'], { limit: 3 }), (r) => r.sources_status.smithery === 'ok' && r.sources_status.official === 'ok'],
  ['skills.sh search', () => skills.searchSkills(['extract', 'design', 'system'], { limit: 3 }), (r) => r.results.length > 0],
  ['plugins search', () => plugins.searchPlugins(['security', 'review'], { limit: 3 }), (r) => r.marketplace_size > 0],
  ['hn search', () => hn.searchHn(['design', 'tokens'], { limit: 3 }), (r) => r.results.length > 0],
];

let failed = 0;
for (const [name, run, ok] of checks) {
  try {
    const result = await run();
    const pass = ok(result);
    if (!pass) failed++;
    console.log(`${pass ? '✔' : '✖'} ${name}`);
  } catch (err) {
    failed++;
    console.log(`✖ ${name}: ${err.name}: ${err.message}`);
  }
}
console.log(failed ? `\n${failed} source(s) failing` : '\nall sources OK');
process.exitCode = failed ? 1 : 0;
