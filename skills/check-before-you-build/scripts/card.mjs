#!/usr/bin/env node
// Shareable verdict card (SPEC §11.3): one self-contained 1200×630 HTML file, no external requests.
// Variants follow the purpose: launch → verdict + scores; fun → "My next build"; me → "Building for myself".
// Usage: node card.mjs <evidence.json> [--out card.html] [--theme auto|light|dark]
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { errorObject, isMain, parseArgs } from './lib/cli.mjs';

const VERDICT_STYLE = {
  BUILD: { emoji: '✅', label: 'Open space: go build it', hue: 145 },
  BUILD_WITH_ANGLE: { emoji: '🔀', label: 'Build it with an angle', hue: 230 },
  CONTRIBUTE: { emoji: '🤝', label: 'Join an existing project', hue: 185 },
  FORK: { emoji: '🍴', label: 'Revive an abandoned project', hue: 35 },
  DROP: { emoji: '📚', label: 'Already well covered', hue: 215 },
  UNCLEAR: { emoji: '❔', label: 'Mixed signals', hue: 260 },
};

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const clip = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
};

export function formatCount(n) {
  if (n === undefined || n === null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}

function popularityLabel(item) {
  const s = item.signals || {};
  if (s.stars) return `${formatCount(s.stars)} ★`;
  if (s.installs) return `${formatCount(s.installs)} installs`;
  if (s.downloads_weekly) return `${formatCount(s.downloads_weekly)}/wk`;
  if (s.uses) return `${formatCount(s.uses)} uses`;
  return null;
}

function agoLabel(iso, now = Date.now()) {
  if (!iso) return null;
  const days = Math.max(0, Math.round((now - new Date(iso).getTime()) / 86400000));
  if (days === 0) return 'updated today';
  if (days < 60) return `updated ${days}d ago`;
  return `updated ${Math.round(days / 30)}mo ago`;
}

const usable = (list = []) => list.filter((x) => x.verified !== false);

/** The most relevant existing project: direct matches first, then by popularity. */
export function closestMatch(evidence) {
  const rank = { direct: 0, partial: 1, adjacent: 2 };
  const pop = (c) => Math.max(...['stars', 'installs', 'downloads_weekly', 'uses'].map((k) => c.signals?.[k] || 0));
  return [...usable(evidence.competitors)].sort((a, b) => (rank[a.match] ?? 3) - (rank[b.match] ?? 3) || pop(b) - pop(a))[0] || null;
}

function scoreBar(label, value) {
  const v = Math.max(0, Math.min(10, Number(value) || 0));
  return `<div class="bar"><span class="bl">${label}</span><span class="track"><span class="fill" style="width:${v * 10}%"></span></span><span class="bv">${v.toFixed(1).replace(/\.0$/, '')}/10</span></div>`;
}

const SOURCE_NAMES = { catalog: 'Catalog', github: 'GitHub', skills: 'skills.sh', plugins: 'Claude plugins', mcp: 'MCP registries', npm: 'npm', pypi: 'PyPI', hn: 'Hacker News', web: 'Web' };

/** The sources this run actually used (status "ok"); falls back to the core list for old evidence. */
export function sourcesLine(evidence) {
  const status = evidence.sources_status || {};
  const used = Object.entries(SOURCE_NAMES)
    .filter(([key]) => String(status[key] ?? '').startsWith('ok'))
    .map(([, name]) => name);
  return used.length ? used.join(' · ') : 'GitHub · skills.sh · MCP registries · npm · Hacker News';
}

function chips(items, max = 5) {
  return usable(items)
    .slice(0, max)
    .map((b) => `<span class="chip">${escapeHtml(clip(b.name || (b.id || '').split('/').pop(), 24))}</span>`)
    .join('');
}

export function renderCard(evidence, { theme = 'auto', now = Date.now() } = {}) {
  const purpose = evidence.idea?.purpose || 'launch';
  const code = evidence.verdict?.code || 'UNCLEAR';
  const style = VERDICT_STYLE[code] || VERDICT_STYLE.UNCLEAR;
  const hue = purpose === 'launch' ? style.hue : purpose === 'fun' ? 280 : 165;
  const idea = clip(evidence.idea?.summary || evidence.idea?.text, 110);
  const top = closestMatch(evidence);
  const gap = usable(evidence.gaps || [])[0]?.statement;
  const blocks = (evidence.building_blocks || []).filter((b) => b.type === 'use' || b.type === 'fork');
  const learn = (evidence.building_blocks || []).filter((b) => b.type === 'learn');
  const date = (evidence.created || new Date(now).toISOString()).slice(0, 10);

  let headline;
  let body = '';
  if (purpose === 'fun') {
    headline = `<div class="badge">🎓 My next build</div>`;
    body += learn.length ? `<div class="row"><span class="k">Learning from</span><span class="chips">${chips(learn, 4)}</span></div>` : '';
    body += blocks.length ? `<div class="row"><span class="k">Building with</span><span class="chips">${chips(blocks)}</span></div>` : '';
  } else if (purpose === 'me') {
    headline = `<div class="badge">🛠️ Building for myself</div>`;
    if (top) body += `<div class="row"><span class="k">Might save time</span><span class="v">${escapeHtml(top.name)}${popularityLabel(top) ? ` · ${popularityLabel(top)}` : ''}</span></div>`;
    body += blocks.length ? `<div class="row"><span class="k">Building with</span><span class="chips">${chips(blocks)}</span></div>` : '';
  } else {
    headline = `<div class="badge">${style.emoji} ${style.label}</div>`;
    const s = evidence.scores || {};
    body += `<div class="bars">${scoreBar('Saturation', s.saturation)}${scoreBar('Demand', s.demand)}${scoreBar('Gap', s.gap)}</div>`;
    if (top) {
      const meta = [popularityLabel(top), agoLabel(top.signals?.pushed_at, now)].filter(Boolean).join(' · ');
      body += `<div class="row"><span class="k">Closest existing</span><span class="v">${escapeHtml(top.name)}${meta ? ` <em>${escapeHtml(meta)}</em>` : ''}</span></div>`;
    }
    if (gap) body += `<div class="row"><span class="k">Open gap</span><span class="v">${escapeHtml(clip(gap, 120))}</span></div>`;
  }
  const confidence = purpose === 'launch' && evidence.verdict?.confidence ? ` · confidence: ${escapeHtml(evidence.verdict.confidence)}` : '';

  const light = `--bg:hsl(${hue} 60% 98%);--fg:hsl(${hue} 30% 12%);--muted:hsl(${hue} 15% 40%);--accent:hsl(${hue} 70% 42%);--soft:hsl(${hue} 60% 92%);--track:hsl(${hue} 25% 88%)`;
  const dark = `--bg:hsl(${hue} 30% 9%);--fg:hsl(${hue} 30% 94%);--muted:hsl(${hue} 15% 68%);--accent:hsl(${hue} 80% 66%);--soft:hsl(${hue} 35% 17%);--track:hsl(${hue} 20% 22%)`;
  const themeCss =
    theme === 'light' ? `:root{${light}}` : theme === 'dark' ? `:root{${dark}}` : `:root{${light}}@media (prefers-color-scheme:dark){:root{${dark}}}`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1200">
<title>check-before-you-build: ${escapeHtml(clip(idea, 60))}</title>
<style>
${themeCss}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;background:var(--bg);color:var(--fg);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:hidden}
.card{width:1200px;height:630px;padding:56px 64px;display:flex;flex-direction:column;gap:26px;background:radial-gradient(1200px 500px at 100% 0%,var(--soft),transparent 60%)}
.top{display:flex;justify-content:space-between;font-size:20px;color:var(--muted);letter-spacing:.02em}
.brand{font-weight:700;color:var(--accent)}
.idea{font-size:34px;line-height:1.25;font-weight:650;max-width:1050px}
.badge{display:inline-block;font-size:44px;font-weight:800;padding:14px 26px;border-radius:18px;background:var(--soft);color:var(--accent);align-self:flex-start}
.bars{display:flex;gap:28px}
.bar{display:flex;align-items:center;gap:12px;font-size:20px;flex:1}
.bl{color:var(--muted);min-width:96px}
.track{flex:1;height:12px;border-radius:6px;background:var(--track);overflow:hidden}
.fill{display:block;height:100%;background:var(--accent);border-radius:6px}
.bv{font-weight:700;min-width:58px;text-align:right}
.row{display:flex;gap:18px;align-items:baseline;font-size:24px}
.k{color:var(--muted);min-width:200px;font-size:20px;text-transform:uppercase;letter-spacing:.06em}
.v{font-weight:600}
.v em{font-style:normal;font-weight:500;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chip{font-size:20px;font-weight:600;padding:6px 14px;border-radius:999px;background:var(--soft)}
.foot{margin-top:auto;display:flex;justify-content:space-between;font-size:18px;color:var(--muted)}
</style></head>
<body><div class="card">
<div class="top"><span class="brand">check-before-you-build</span><span>${escapeHtml(date)}${confidence}</span></div>
<div class="idea">${escapeHtml(idea)}</div>
${headline}
${body}
<div class="foot"><span>Evidence from ${escapeHtml(sourcesLine(evidence))}</span><span>github.com/Smartulf123/check-before-you-build</span></div>
</div></body></html>
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [file] = args._;
  const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + '\n');
  if (!file) {
    out({ ok: false, error: { type: 'Usage', message: 'card.mjs <evidence.json> [--out card.html] [--theme auto|light|dark]' } });
    process.exitCode = 1;
    return;
  }
  try {
    const evidence = JSON.parse(await readFile(file, 'utf8'));
    const theme = ['light', 'dark', 'auto'].includes(args.flags.theme) ? args.flags.theme : 'auto';
    const target = typeof args.flags.out === 'string' ? args.flags.out : join(dirname(file), 'card.html');
    await writeFile(target, renderCard(evidence, { theme }));
    const purpose = evidence.idea?.purpose || 'launch';
    // fun and me runs never show a verdict, so don't hand one to the agent either
    out({ ok: true, card: target, purpose, ...(purpose === 'launch' ? { verdict: evidence.verdict?.code || null } : {}) });
  } catch (err) {
    out({ ok: false, error: errorObject(err) });
    process.exitCode = 1;
  }
}

if (isMain(import.meta.url)) main();
