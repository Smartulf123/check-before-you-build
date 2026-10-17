#!/usr/bin/env node
// README reader. Fetches a repo's README from raw.githubusercontent.com, which does NOT count
// against the GitHub API rate limit, and condenses it to the parts that matter for choosing a
// repo: the intro, features, usage, limitations and comparisons. Installation walls, badges,
// images and long code blocks are dropped so the agent's context stays small.
import { fetchText } from './lib/http.mjs';
import { intFlag, isMain, runCli } from './lib/cli.mjs';

const USAGE = `readme.mjs <command>
  get <owner/repo> [<owner/repo> ...] [--max-chars 5000] [--full]
      condensed README per repo (raw.githubusercontent.com, no API calls)`;

const CANDIDATES = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.rst', 'README.markdown', 'README.asciidoc', 'README.adoc', 'README.txt', 'README', '.github/README.md', 'docs/README.md'];

/** reStructuredText: turn underlined/overlined titles into markdown headings, drop directives. */
export function rstToMarkdown(rst) {
  const lines = rst.split('\n');
  const out = [];
  const levels = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] ?? '';
    const underline = /^([=\-~^"'`#*+.:_])\1{2,}\s*$/.exec(next);
    if (line.trim() && underline && next.trim().length >= line.trim().length - 2 && !/^\s/.test(line)) {
      const ch = underline[1];
      if (!levels.includes(ch)) levels.push(ch);
      out.push(`${'#'.repeat(Math.min(levels.indexOf(ch) + 1, 4))} ${line.trim()}`);
      i++; // skip the underline
      continue;
    }
    if (/^([=\-~^"'`#*+])\1{2,}\s*$/.test(line)) continue; // overlines
    if (/^\.\.\s+(image|figure|raw|\|)/i.test(line) || /^\s+:(target|alt|width|height|align):/.test(line)) continue;
    out.push(line.replace(/`([^`<]+)\s*<[^>]+>`_+/g, '$1').replace(/``([^`]+)``/g, '`$1`'));
  }
  return out.join('\n');
}

/** Section headings worth keeping when condensing. */
const KEEP_HEADING = /feature|why|overview|about|what|introduc|highlight|usage|getting started|quick ?start|example|limitation|caveat|known issue|compar|vs\.?|alternative|when (to|not)|use case|faq|status|roadmap|philosophy|design|how it works|concept/i;
const DROP_HEADING = /install|setup|contribut|sponsor|backer|licen[cs]e|changelog|acknowledg|credit|support|donat|star history|code of conduct|security|development|build from source|table of contents|contents/i;

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&middot;': '·', '&bull;': '•' };

export function cleanMarkdown(md) {
  // Protect code blocks from the line filters below, then restore them shortened.
  const blocks = [];
  const shielded = md.replace(/```[\s\S]*?```/g, (block) => {
    const lines = block.split('\n');
    blocks.push(lines.length > 12 ? [...lines.slice(0, 10), '…', '```'].join('\n') : block);
    return `\u0000CODE${blocks.length - 1}\u0000`;
  });
  const cleaned = shielded
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(picture|img|source|svg|video|iframe)[\s\S]*?>/gi, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(p|div|a|br|h\d|b|strong|em|i|span|center|sup|sub|details|summary|table|tr|td|th|thead|tbody)[^>]*>/gi, '\n')
    .replace(/<\/?[a-z][a-z0-9-]*(\s[^>]*)?\/?>/gi, '') // any other HTML tag (link, meta, …)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '') // linked badges
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1') // keep link text, drop URLs
    .split('\n')
    .filter((line) => !/^\s*[|·•\-–]?\s*$/.test(line) || line === '') // lone separators
    .join('\n')
    .replace(/(?:^[ \t]*[^\n#\u0000]{1,18}[ \t]*\n(?:[ \t]*[|·•][ \t]*\n)?){4,}/gm, '') // nav-link runs
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
}

/** Split markdown into { heading, level, body } sections; text before the first heading is the intro. */
export function splitSections(md) {
  const sections = [{ heading: '(intro)', level: 0, body: '' }];
  for (const line of md.split('\n')) {
    const m = /^(#{1,4})\s+(.*)$/.exec(line);
    if (m) sections.push({ heading: m[2].trim(), level: m[1].length, body: '' });
    else sections[sections.length - 1].body += line + '\n';
  }
  return sections.map((s) => ({ ...s, body: s.body.trim() })).filter((s) => s.body || s.level === 1);
}

export function condense(md, maxChars = 5000) {
  const sections = splitSections(cleanMarkdown(md));
  const kept = [];
  let used = 0;
  const take = (s, cap) => {
    if (used >= maxChars || !s.body) return;
    const room = Math.min(cap, maxChars - used);
    const body = s.body.length > room ? s.body.slice(0, room).replace(/\s+\S*$/, '') + ' …' : s.body;
    kept.push(s.level === 0 ? body : `## ${s.heading}\n${body}`);
    used += body.length;
  };
  // 1. title + intro always first. Only treat a level-1 heading as the title when it opens the
  //    document; a later "# macOS" in an install guide is not the project name.
  const title = sections[1]?.level === 1 && sections[0].body.length < 400 ? sections[1] : null;
  if (title) kept.push(`# ${title.heading}`);
  take(sections[0], 1500);
  if (title?.body) take(title, 1500);
  // 2. the sections that help a choice
  for (const s of sections) {
    if (s.level === 0 || s === title) continue;
    if (KEEP_HEADING.test(s.heading) && !DROP_HEADING.test(s.heading)) take(s, 1200);
  }
  // 3. if room is left, the first few remaining non-boilerplate sections
  for (const s of sections) {
    if (used >= maxChars * 0.8) break;
    if (s.level === 0 || s === title || KEEP_HEADING.test(s.heading) || DROP_HEADING.test(s.heading)) continue;
    take(s, 600);
  }
  return { text: kept.join('\n\n'), headings: sections.filter((s) => s.level > 0).map((s) => s.heading) };
}

async function fetchCandidate(fullName, file) {
  const url = `https://raw.githubusercontent.com/${fullName}/HEAD/${file}`;
  let { status, text } = await fetchText(url);
  if (status === 404 || !text) return null;
  // Monorepos often symlink the root README; raw serves the link target path as text.
  const link = text.trim();
  if (link.length < 200 && !link.includes('\n') && /\.(md|markdown|rst)$/i.test(link)) {
    const target = await fetchText(`https://raw.githubusercontent.com/${fullName}/HEAD/${link.replace(/^\.?\//, '')}`);
    if (target.text) text = target.text;
  }
  if (/\.rst$/i.test(file)) text = rstToMarkdown(text);
  return { url, text };
}

export async function getReadme(fullName, { maxChars = 5000, full = false } = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(fullName || '')) throw new Error('expected owner/repo');
  let found = null;
  for (const file of CANDIDATES) {
    found = await fetchCandidate(fullName, file);
    if (found) break;
  }
  // A tiny root README (contributor notes, a pointer) often has a fuller sibling in .github/.
  if (found && found.text.length < 800 && !found.url.includes('/.github/')) {
    const alt = await fetchCandidate(fullName, '.github/README.md');
    if (alt && alt.text.length > found.text.length) found = alt;
  }
  if (!found) return { id: `github:${fullName}`, found: false };
  const { url, text } = found;
  if (full) return { id: `github:${fullName}`, found: true, source_url: url, chars_original: text.length, excerpt: text };
  const { text: excerpt, headings } = condense(text, maxChars);
  return { id: `github:${fullName}`, found: true, source_url: url, chars_original: text.length, excerpt, headings };
}

if (isMain(import.meta.url)) {
  runCli(
    {
      get: async (ids, flags) => {
        if (!ids.length) throw new Error('get needs at least one owner/repo');
        const results = [];
        for (const id of ids) {
          try {
            results.push(await getReadme(id, { maxChars: intFlag(flags, 'max-chars', 5000), full: Boolean(flags.full) }));
          } catch (err) {
            results.push({ id: `github:${id}`, found: false, error: err.message });
          }
        }
        return { source: 'readme', results };
      },
    },
    USAGE,
  );
}
