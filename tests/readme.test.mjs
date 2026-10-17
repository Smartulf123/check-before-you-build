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
