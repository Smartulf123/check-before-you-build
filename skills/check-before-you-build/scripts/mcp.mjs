#!/usr/bin/env node
// MCP servers: Smithery (primary, description-aware, has useCount) plus the official MCP
// registry (name-only substring search, used as a presence check). See sources-findings.md.
import { fetchJson } from './lib/http.mjs';
import { errorObject, intFlag, isMain, runCli } from './lib/cli.mjs';

const USAGE = `mcp.mjs <command>
  search <keywords...> [--limit 20]   Smithery (all keywords) + official registry (each keyword ≥ 4 chars, max 3)`;

export function mapSmithery(s) {
  return {
    id: `smithery:${s.qualifiedName}`,
    name: s.displayName || s.qualifiedName,
    url: `https://smithery.ai/server/${s.qualifiedName}`,
    source: 'smithery',
    description: (s.description || '').slice(0, 400),
    homepage: s.homepage || null,
    signals: { uses: s.useCount ?? 0, verified: Boolean(s.verified), created_at: s.createdAt || null },
  };
}

export function mapOfficial(entry) {
  const s = entry.server || entry;
  return {
    id: `mcp-registry:${s.name}`,
    name: s.title || s.name,
    url: s.repository?.url || s.websiteUrl || `https://registry.modelcontextprotocol.io/v0.1/servers?search=${encodeURIComponent(s.name)}`,
    source: 'mcp-registry',
    description: s.description || '',
    signals: { version: s.version || null },
  };
}

/** Official registry matches names only, one word at a time. */
export function officialTerms(keywords) {
  const words = keywords.join(' ').toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 3);
}

export async function searchServers(keywords, { limit = 20 } = {}) {
  const text = keywords.join(' ').trim();
  if (!text) throw new Error('search needs at least one keyword');
  const status = {};
  const results = [];

  try {
    const { data } = await fetchJson(
      `https://registry.smithery.ai/servers?q=${encodeURIComponent(text)}&pageSize=${Math.min(limit, 50)}`,
    );
    results.push(...(data.servers || []).map(mapSmithery));
    status.smithery = 'ok';
  } catch (err) {
    status.smithery = { failed: errorObject(err) };
  }

  const seen = new Set();
  for (const term of officialTerms(keywords)) {
    try {
      const { data } = await fetchJson(
        `https://registry.modelcontextprotocol.io/v0.1/servers?search=${encodeURIComponent(term)}&version=latest&limit=30`,
      );
      for (const entry of data.servers || []) {
        const mapped = mapOfficial(entry);
        if (!seen.has(mapped.id)) {
          seen.add(mapped.id);
          results.push(mapped);
        }
      }
      status.official = status.official || 'ok';
    } catch (err) {
      status.official = { failed: errorObject(err) };
    }
  }
  if (!status.official) status.official = 'skipped (no keyword ≥ 4 chars)';

  return { source: 'mcp', query: text, sources_status: status, results };
}

if (isMain(import.meta.url)) {
  runCli({ search: (args, flags) => searchServers(args, { limit: intFlag(flags, 'limit', 20) }) }, USAGE);
}
