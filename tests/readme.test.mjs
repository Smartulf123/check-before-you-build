import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const readme = await load('readme.mjs');

const SAMPLE = `<p align="center"><img src="logo.png"></p>
[![npm](https://img.shields.io/npm/v/x.svg)](https://npm.im/x)

# Zod

TypeScript-first schema validation with static type inference.

## Installation
npm install zod
(long install instructions)

## Features
- Zero dependencies
- Works in Node and browsers

## Basic usage
\`\`\`ts
const s = z.string();
\`\`\`

## Comparison
Unlike Yup, types are inferred.

## Contributing
Please read CONTRIBUTING.md.

## License
MIT
`;

test('condense keeps intro, features, usage and comparison; drops install, contributing, license, badges', () => {
  const { text, headings } = readme.condense(SAMPLE, 5000);
  assert.match(text, /# Zod/);
  assert.match(text, /TypeScript-first schema validation/);
  assert.match(text, /## Features/);
  assert.match(text, /## Basic usage/);
  assert.match(text, /## Comparison/);
  assert.doesNotMatch(text, /npm install zod/);
  assert.doesNotMatch(text, /CONTRIBUTING/);
  assert.doesNotMatch(text, /img.shields.io|logo.png/);
  assert.ok(headings.includes('Installation'));
});

test('condense respects the character budget', () => {
  const long = `# X\n\n${'intro words '.repeat(400)}\n\n## Features\n${'feature '.repeat(400)}`;
  const { text } = readme.condense(long, 800);
  assert.ok(text.length < 1100, `length ${text.length}`);
});

test('long code blocks are shortened', () => {
  const md = `# X\n\n## Usage\n\`\`\`js\n${Array.from({ length: 30 }, (_, i) => `line${i}`).join('\n')}\n\`\`\``;
  const { text } = readme.condense(md);
  assert.match(text, /line8/);
  assert.doesNotMatch(text, /line25/);
});

test('rstToMarkdown turns underlined titles into headings and drops image directives', () => {
  const rst = 'python-telegram-bot\n===================\n\n.. image:: https://x/badge.svg\n   :target: https://x\n\nWe have made you a wrapper.\n\nIntroduction\n------------\nThis library provides an interface.';
  const md = readme.rstToMarkdown(rst);
  assert.match(md, /^# python-telegram-bot/m);
  assert.match(md, /^## Introduction/m);
  assert.doesNotMatch(md, /badge\.svg|:target:/);
  const { text } = readme.condense(md);
  assert.match(text, /wrapper/);
  assert.match(text, /interface/);
});

test('sub-paths read a skill or plugin folder inside a bigger repo', async () => {
  assert.deepEqual(readme.subPathCandidates('codex-wrapped').slice(0, 3), ['codex-wrapped/SKILL.md', 'codex-wrapped/README.md', 'codex-wrapped/readme.md']);
  assert.ok(readme.subPathCandidates('codex-wrapped').includes('skills/codex-wrapped/SKILL.md'));
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return String(url).endsWith('/skills/codex-wrapped/SKILL.md')
      ? new Response('# Codex Wrapped\n\nA yearly recap of your Codex sessions.', { status: 200 })
      : new Response('nf', { status: 404 });
  };
  const r = await readme.getReadme('openai/skills/codex-wrapped');
  assert.equal(r.found, true);
  assert.equal(r.id, 'github:openai/skills/codex-wrapped');
  assert.match(r.excerpt, /yearly recap/);
  assert.ok(calls.every((u) => u.startsWith('https://raw.githubusercontent.com/openai/skills/HEAD/')));
});

test('a sub-path without its own README falls back to the repo README with a warning', async () => {
  globalThis.fetch = async (url) =>
    String(url).endsWith('/HEAD/README.md') ? new Response('# Marketplace\n\nMany plugins.', { status: 200 }) : new Response('nf', { status: 404 });
  const r = await readme.getReadme('anthropics/claude-plugins-official/plugins/session-report');
  assert.equal(r.found, true);
  assert.equal(r.fallback, 'repo-root');
  assert.match(r.warning, /not of the folder/);
});

test('getReadme tries README variants on raw.githubusercontent.com', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return String(url).endsWith('/readme.md')
      ? new Response(SAMPLE, { status: 200 })
      : new Response('not found', { status: 404 });
  };
  const r = await readme.getReadme('colinhacks/zod');
  assert.equal(r.found, true);
  assert.match(calls[0], /^https:\/\/raw\.githubusercontent\.com\/colinhacks\/zod\/HEAD\/README\.md$/);
  assert.match(r.source_url, /readme\.md$/);
  assert.match(r.excerpt, /Zod/);
});

test('a symlinked README inside .github is resolved relative to its folder', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.endsWith('/HEAD/.github/README.md')) return new Response('../packages/toolkit/README.md', { status: 200 });
    if (u.endsWith('/HEAD/packages/toolkit/README.md')) return new Response('# Redux Toolkit\n\nThe official toolset.', { status: 200 });
    return new Response('nf', { status: 404 });
  };
  const r = await readme.getReadme('reduxjs/redux-toolkit');
  assert.match(r.excerpt, /official toolset/);
});

test('a deeply nested skill folder is found through the repo tree', async () => {
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/git/trees/')) return Response.json({ tree: [{ type: 'blob', path: 'plugins/utils/skills/design-md/SKILL.md' }] });
    if (u.endsWith('/HEAD/plugins/utils/skills/design-md/SKILL.md')) return new Response('# design-md skill', { status: 200 });
    return new Response('nf', { status: 404 });
  };
  const r = await readme.getReadme('acme/nested-skills/design-md');
  assert.match(r.source_url, /plugins\/utils\/skills\/design-md\/SKILL\.md$/);
  assert.equal(r.fallback, undefined);
});
