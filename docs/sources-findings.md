# Source findings (Milestone 0)

> Probed manually on **2026-10-17** with real requests. This document is the ground truth for the scripts in M1.
> When a source changes behaviour, update this file first.

## Summary

| Source | Status | Method chosen | Popularity signal |
|---|---|---|---|
| GitHub repo search | ✅ verified | REST `search/repositories` (with `gh` token when available) | stars |
| GitHub repo details | ✅ verified | REST `repos/{owner}/{repo}` | stars, pushed_at, license, archived, topics |
| GitHub issue search | ✅ verified | REST `search/issues` sorted by 👍 | 👍 reactions |
| npm | ✅ verified | registry search + downloads API | weekly downloads |
| PyPI | 🔁 fallback | JSON metadata API; discovery via web search | (none reliable) |
| Hacker News | ✅ verified | Algolia `search` / `search_by_date` | points |
| Official MCP registry | ✅ verified, limited | `v0.1/servers?search=` (name-only) | none |
| Smithery | ✅ verified | `registry.smithery.ai/servers?q=`, no key | `useCount` |
| Glama | ⏭️ deferred | needs API key + attribution | — |
| mcp.so | 🔁 fallback | web search only | — |
| skills.sh | ✅ verified (undocumented) | `skills.sh/api/search?q=` | installs |
| Claude plugin marketplace (official) | ✅ verified | download `marketplace.json`, match locally | none |
| Community plugin marketplaces | 🔁 fallback | covered by GitHub repo search + skills.sh | stars / installs |
| Web | ✅ (agent-native) | the agent's own web search tool | — |

---

## GitHub

### Repo search

- **Endpoint:** `GET https://api.github.com/search/repositories?q=<terms>&per_page=<n>`
- **Rate limits (from response headers):** 10 requests/min unauthenticated · **30 requests/min** with a token (`X-RateLimit-Resource: search`).
- **Token:** `gh auth token`, used in memory only. A `User-Agent` header is required.

**Query-writing findings (important for the skill's instructions):**

| Finding | Evidence | Rule for the skill |
|---|---|---|
| Natural-language phrases return junk or nothing | `design tokens from url` → spam repos; via `gh` CLI, a quoted phrase = exact match → 0 results | Use **2–4 core keywords**, unquoted |
| Good keyword choice finds the leaders immediately | `extract design system website` → designlang (4,248★), dembrandt (3,656★), arvindrk (246★) | Generate several **varied** short queries per idea |
| Spam / keyword-stuffed repos pollute results | `design tokens url` sorted by stars → unrelated repos | Add `stars:>20` (default) and keep the default best-match sort |
| Topic queries are strong for categories | `topic:design-tokens` → awesome-design-md, panda, style-dictionary | Also run 1–2 `topic:<slug>` queries |
| A product name ≠ repo name | "designlang" lives at `Manavarya09/design-extract`; searching `designlang` misses it | Search by **function**, not by guessed product name |
| `in:readme` is too broad | → 1.5M results | Don't use `in:readme` |
| `gh search repos` with separate words works | `gh search repos extract design system website` → same top 3 | Either works; scripts use REST for uniform output |

### Repo details

- **Endpoint:** `GET https://api.github.com/repos/{owner}/{repo}`
- **Limit:** 60/h unauthenticated · 5,000/h authenticated (`core`).
- **Fields used:** `stargazers_count`, `pushed_at`, `license.spdx_id`, `archived`, `topics`, `forks_count`, `open_issues_count`, `full_name` (detects renames).
- A nonexistent repo returns **404**, which `verify.mjs` relies on.

### Issue search

- **Endpoint:** `GET https://api.github.com/search/issues?q=repo:{o}/{r}+is:issue+is:open&sort=reactions-%2B1&order=desc`
- Works. It shares the 30/min search limit.
- Note: many repos have few or no 👍 on issues, so issue *titles* matter as much as reaction counts.

## npm

- **Search:** `GET https://registry.npmjs.org/-/v1/search?text=<q>&size=<n>`. Each result **already includes downloads** (`downloads.weekly`, `downloads.monthly`).
- **Finding:** ranking is heavily popularity-weighted. `design tokens extract` returned `extract-files` and `mini-css-extract-plugin`. The agent **must judge relevance**; don't trust the order.
- **Downloads:** `GET https://api.npmjs.org/downloads/point/last-week/<pkg>` → e.g. dembrandt 4,415/week, designlang 790/week.
- **Metadata:** `GET https://registry.npmjs.org/<pkg>/latest` → `license`, `repository.url` (links a package to its GitHub repo).

## PyPI

- **Metadata:** `GET https://pypi.org/pypi/<pkg>/json` → name, version, license, project URLs. ✅
- **Search:** there is no search API. The HTML search page responds (200), but scraping it is fragile.
- **Decision:** discover Python packages via **web search** (`site:pypi.org <terms>`) or via GitHub repos, then fetch metadata from the JSON API.

## Hacker News (Algolia)

- **Endpoints:** `GET https://hn.algolia.com/api/v1/search?query=<q>&tags=story` (relevance) and `/search_by_date?...` (recency). `tags=show_hn` / `ask_hn` filter post types.
- **Fields:** `points`, `num_comments`, `created_at`, `title`, `url`, `objectID` (→ `https://news.ycombinator.com/item?id=<objectID>`).
- No key, no meaningful limit at our volume.

## MCP servers

### Official MCP registry

- **Endpoint:** `GET https://registry.modelcontextprotocol.io/v0.1/servers?search=<term>&version=latest&limit=<n>` (`v0` also works).
- **Finding:** `search` matches **server names only**, as a substring, effectively one word. `design tokens` → 0 results; `tokens` → 7; `design` → 100+.
- Without `version=latest`, the same server appears once per version.
- Pagination: `metadata.nextCursor`.
- No popularity signal. `_meta` holds status and dates only.
- **Decision:** query with 1–3 **single keywords**; treat as a presence check, not a ranking source.

### Smithery

- **Endpoint:** `GET https://registry.smithery.ai/servers?q=<q>&pageSize=<n>`, which works **without an API key**.
- Search is **description-aware**: `reddit research` → relevant servers.
- **Popularity:** `useCount` (e.g. 9,761). Pagination: `pagination.totalCount`, `totalPages`.
- **Decision:** the primary MCP discovery source.

### Glama · mcp.so

- **Glama:** API requires a key, and its data license requires attribution on every page → **deferred** (v2 at the earliest).
- **mcp.so:** no API found → web search fallback.

## skills.sh

- **Endpoint (undocumented):** `GET https://skills.sh/api/search?q=<q>` → JSON `{query, searchType, skills: [{id, source, skillId, name, installs}]}`.
- **Behaviour:** multi-word queries use **semantic** search; single words use **fuzzy** search. Up to 100 results.
- **Examples:** `extract design system` → arvindrk/extract-design-system (130,285 installs). `reddit research` → lignertys/reddit-research (9,599).
- **No description field.** The agent judges relevance from the name and source repo, and can fetch the repo for details.
- **The skills CLI** (`npx skills find`) is interactive only, so it's not usable by scripts.
- **Risk:** undocumented, so it may change. The script must fail gracefully and report the source as `failed`. Use a descriptive User-Agent and low volume.

## Claude plugin marketplaces

- **Official:** `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/.claude-plugin/marketplace.json` → **315 plugins** with `name`, `description`, `author`, `category`, `source`, `homepage`.
  - **Decision:** download once per run (cache), match keywords locally against name, description and category.
- **Community marketplaces:** GitHub code search finds about 42,000 `marketplace.json` files, too many to index. **Decision:** rely on GitHub repo search plus skills.sh for community plugins. A curated list of notable community marketplaces may be added to the catalog later (v2).

## Web

- Handled by the agent's built-in web search and fetch tools. No script.
- Used for: commercial products, PyPI discovery, mcp.so, general demand evidence.

---

## Consequences for the spec

1. **§6.2 / sources.md:** add query-writing rules (short unquoted keywords, `stars:>20`, `topic:` queries, search by function).
2. **§7:** add Smithery as the primary MCP source; mark Glama deferred; describe skills.sh `/api/search`; the official marketplace = local match over one file.
3. **§9.1 popularity:** add Smithery `useCount` → `min(1, log10(uses + 1) / 4)`.
4. **Rate budget:** at 30 searches/min authenticated, a standard run (8 terms + `topic:` queries + issue mining) fits in about 1 minute of search budget. Unauthenticated (10/min), quick mode is the realistic ceiling, and the report should suggest `gh auth login`.
