#!/usr/bin/env node
// README reader. Fetches a repo's README from raw.githubusercontent.com, which does NOT count
// against the GitHub API rate limit, and condenses it to the parts that matter for choosing a
// repo: the intro, features, usage, limitations and comparisons. Installation walls, badges,
// images and long code blocks are dropped so the agent's context stays small.
import { posix } from 'node:path';
import { fetchJson, fetchText } from './lib/http.mjs';
import { githubHeaders } from './lib/gh.mjs';
import { intFlag, isMain, runCli } from './lib/cli.mjs';

const USAGE = `readme.mjs <command>
  get <owner/repo> [<owner/repo> ...] [--max-chars 5000] [--full]
      condensed README per repo (raw.githubusercontent.com; one core API call only for deeply nested skill folders)
  license <owner/repo> [<owner/repo> ...]
      read the license file and detect common licenses (for NOASSERTION or missing licenses);
      "custom-restricted" means standard text with added limits such as non-commercial: treat as Other`;

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
    // the link is relative to the folder the link file lives in (e.g. .github/README.md → ../packages/x/README.md)
    const resolved = posix.normalize(posix.join(posix.dirname(file), link)).replace(/^(\.\.\/)+/, '');
    const target = await fetchText(`https://raw.githubusercontent.com/${fullName}/HEAD/${resolved}`);
    if (target.text) text = target.text;
  }
  if (/\.rst$/i.test(file)) text = rstToMarkdown(text);
  return { url, text };
}

/** Files to try for a sub-path: a skill or plugin folder inside a bigger repo. */
export function subPathCandidates(sub) {
  const last = sub.split('/').pop();
  const dirs = [...new Set([sub, `skills/${last}`, `plugins/${last}`])];
  return dirs.flatMap((d) => [`${d}/SKILL.md`, `${d}/README.md`, `${d}/readme.md`]);
}

/**
 * Last resort for a skill or plugin folder nested deeper than the usual places
 * (e.g. plugins/x/skills/<name>): one call to the git trees API (core quota, not search).
 */
export async function findNestedFolder(fullName, last) {
  try {
    const { data } = await fetchJson(`https://api.github.com/repos/${fullName}/git/trees/HEAD?recursive=1`, { headers: githubHeaders() });
    const wanted = (path) => {
      const parts = path.split('/');
      return parts.length >= 2 && parts.at(-2).toLowerCase() === last.toLowerCase() && /^(SKILL|README)\.md$/i.test(parts.at(-1));
    };
    return (data?.tree || []).find((t) => t.type === 'blob' && wanted(t.path))?.path ?? null;
  } catch {
    return null;
  }
}

export async function getReadme(id, { maxChars = 5000, full = false } = {}) {
  const m = /^([\w.-]+\/[\w.-]+)(?:\/([\w./-]+))?$/.exec(id || '');
  if (!m) throw new Error('expected owner/repo or owner/repo/path');
  const [, fullName, sub] = m;
  let found = null;
  for (const file of sub ? subPathCandidates(sub.replace(/\/+$/, '')) : CANDIDATES) {
    found = await fetchCandidate(fullName, file);
    if (found) break;
  }
  if (!found && sub) {
    const nested = await findNestedFolder(fullName, sub.replace(/\/+$/, '').split('/').pop());
    if (nested) found = await fetchCandidate(fullName, nested);
  }
  let fallback = false;
  if (!found && sub) {
    // fall back to the repo README when the folder has none, and say so: the repo README
    // describes the host repo (often a marketplace), not the skill or plugin itself.
    for (const file of CANDIDATES) {
      found = await fetchCandidate(fullName, file);
      if (found) break;
    }
    fallback = Boolean(found);
  }
  // A tiny root README (contributor notes, a pointer) often has a fuller sibling in .github/.
  if (!sub && found && found.text.length < 800 && !found.url.includes("/.github/")) {
    const alt = await fetchCandidate(fullName, '.github/README.md');
    if (alt && alt.text.length > found.text.length) found = alt;
  }
  if (!found) return { id: `github:${id}`, found: false };
  const { url, text } = found;
  const note = fallback ? { fallback: 'repo-root', warning: `no README in ${sub}; this is the README of ${fullName}, not of the folder` } : {};
  if (full) return { id: `github:${id}`, found: true, source_url: url, chars_original: text.length, ...note, excerpt: text };
  const { text: excerpt, headings } = condense(text, maxChars);
  return { id: `github:${id}`, found: true, source_url: url, chars_original: text.length, ...note, excerpt, headings };
}

const LICENSE_FILES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'COPYING', 'license', 'license.md', 'LICENSE-MIT'];

/** Recognise common licenses from their text. Returns an SPDX id or null. */
export function detectLicense(text) {
  const t = String(text || '').replace(/\s+/g, ' ');
  // Standard text edited with extra restrictions (for example MIT rewritten as "non-commercial
  // only") is not that license anymore. Report it as custom so it is never treated as permissive.
  if (/non-?commercial|not for commercial|commercial use is (not permitted|prohibited|forbidden)|commons clause|polyform|non-ai|may not be used to train|source[- ]available|business source license/i.test(t)) {
    return 'custom-restricted';
  }
  if (/GNU AFFERO GENERAL PUBLIC LICENSE/i.test(t)) return 'AGPL-3.0';
  if (/GNU LESSER GENERAL PUBLIC LICENSE/i.test(t)) return /Version 2\.1/i.test(t) ? 'LGPL-2.1' : 'LGPL-3.0';
  if (/GNU GENERAL PUBLIC LICENSE/i.test(t)) return /Version 2,/i.test(t) ? 'GPL-2.0' : 'GPL-3.0';
  if (/Mozilla Public License,? (Version|v\.?) ?2\.0/i.test(t)) return 'MPL-2.0';
  if (/Apache License,? Version 2\.0/i.test(t)) return 'Apache-2.0';
  if (/This is free and unencumbered software released into the public domain/i.test(t)) return 'Unlicense';
  if (/Permission is hereby granted, free of charge, to any person obtaining a copy/i.test(t)) return 'MIT';
  if (/Permission to use, copy, modify, and\/?or distribute this software for any purpose/i.test(t)) return 'ISC';
  if (/Redistribution and use in source and binary forms/i.test(t)) return /Neither the name/i.test(t) ? 'BSD-3-Clause' : 'BSD-2-Clause';
  if (/CC0 1\.0 Universal/i.test(t)) return 'CC0-1.0';
  return null;
}

/** Read a repo's license file from raw.githubusercontent.com (no API quota). */
export async function getLicense(fullName) {
  for (const file of LICENSE_FILES) {
    const url = `https://raw.githubusercontent.com/${fullName}/HEAD/${file}`;
    const { status, text } = await fetchText(url);
    if (status === 404 || !text) continue;
    let body = text;
    // a one-line file that only points to another file ("see LICENSE-MIT")
    const pointer = /^\s*(?:see\s+)?([\w.-]+(?:\/[\w.-]+)+|[\w.-]+\.(?:md|txt)|LICENSE[\w.-]*)\s*$/i.exec(text.trim());
    if (pointer && text.trim().length < 120) {
      const next = await fetchText(`https://raw.githubusercontent.com/${fullName}/HEAD/${pointer[1].replace(/^\.?\//, '')}`);
      if (next.text) body = next.text;
    }
    return { id: `github:${fullName}`, found: true, source_url: url, detected: detectLicense(body), excerpt: body.slice(0, 600) };
  }
  return { id: `github:${fullName}`, found: false };
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
      license: async (ids) => {
        if (!ids.length) throw new Error('license needs at least one owner/repo');
        const results = [];
        for (const id of ids) {
          try {
            results.push(await getLicense(id));
          } catch (err) {
            results.push({ id: `github:${id}`, found: false, error: err.message });
          }
        }
        return { source: 'license', results };
      },
    },
    USAGE,
  );
}
