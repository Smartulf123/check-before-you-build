import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const card = await load('card.mjs');
const NOW = new Date('2026-10-17T00:00:00Z').getTime();

const base = (over = {}) => ({
  created: '2026-10-17T12:00:00Z',
  idea: { text: 'A skill that extracts a website design into DESIGN.md', purpose: 'launch' },
  competitors: [
    { id: 'github:a/small', name: 'small', match: 'partial', signals: { stars: 90000 } },
    { id: 'github:Manavarya09/design-extract', name: 'designlang', match: 'direct', signals: { stars: 4248, pushed_at: '2026-10-14T00:00:00Z' } },
    { id: 'github:x/gone', name: 'gone', match: 'direct', verified: false, signals: { stars: 99999 } },
  ],
  gaps: [{ statement: 'No tool verifies the rebuilt page matches the original' }],
  building_blocks: [
    { id: 'github:microsoft/playwright', name: 'Playwright', type: 'use' },
    { id: 'github:tastejs/todomvc', name: 'TodoMVC', type: 'learn' },
  ],
  scores: { saturation: 9.9, demand: 8.2, gap: 5 },
  verdict: { code: 'BUILD_WITH_ANGLE', confidence: 'high' },
  ...over,
});

test('launch card shows verdict, scores, closest direct match and gap', () => {
  const html = card.renderCard(base(), { now: NOW });
  assert.match(html, /🔀 Build it with an angle/);
  assert.match(html, /Saturation/);
  assert.match(html, /9\.9\/10/);
  assert.match(html, /designlang <em>4\.2k ★ · updated 3d ago<\/em>/); // direct beats a more popular partial
  assert.doesNotMatch(html, /gone/); // unverified items never appear
  assert.match(html, /No tool verifies/);
  assert.match(html, /confidence: high/);
  assert.doesNotMatch(html, /https?:\/\/(?!github\.com)/); // no external requests
});

test('fun card has no verdict or scores, shows learning and building blocks', () => {
  const html = card.renderCard(base({ idea: { text: 'todo app to learn React', purpose: 'fun' } }), { now: NOW });
  assert.match(html, /My next build/);
  assert.match(html, /TodoMVC/);
  assert.match(html, /Playwright/);
  assert.doesNotMatch(html, /Saturation|Build it with an angle|confidence/);
});

test('me card shows time-savers without a verdict', () => {
  const html = card.renderCard(base({ idea: { text: 'recipe tool for me', purpose: 'me' } }), { now: NOW });
  assert.match(html, /Building for myself/);
  assert.match(html, /Might save time/);
  assert.doesNotMatch(html, /Saturation|confidence/);
});

test('user text is escaped and themes are selectable', () => {
  const html = card.renderCard(base({ idea: { text: '<script>alert(1)</script> idea', purpose: 'launch' } }), { theme: 'dark', now: NOW });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /prefers-color-scheme/);
  assert.match(card.renderCard(base(), { theme: 'auto' }), /prefers-color-scheme:dark/);
});

test('formatCount', () => {
  assert.equal(card.formatCount(950), '950');
  assert.equal(card.formatCount(4248), '4.2k');
  assert.equal(card.formatCount(130285), '130k');
  assert.equal(card.formatCount(3900000), '3.9M');
});
