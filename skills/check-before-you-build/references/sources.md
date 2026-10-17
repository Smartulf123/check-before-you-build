# Sources and scripts

Every script prints one JSON object and exits 1 on failure. Run from any directory:
`node <skill-dir>/scripts/<script>.mjs …`

## Query-writing rules

1. **2–4 core keywords, unquoted.** Sentences return junk; quoted text is an exact phrase.
2. **Search by function, not by guessed product name.** A product's name often differs from its repo name.
3. **Several varied keyword sets** per idea: function, synonyms, jargon, the problem itself.
4. GitHub keeps `stars:>20` by default (drops spam). Use `--min-stars 0` only when results are empty.
5. Add 1–2 `topic:<slug>` GitHub searches (e.g. `topic:design-tokens`).
6. Never use `in:readme`. It's too broad.
7. The official MCP registry matches **names only**. `mcp.mjs` handles this by using single words for it and full text for Smithery.
8. **Don't trust ordering** from npm or skills.sh. They rank by popularity, so judge relevance from names and descriptions.

## Commands

### catalog.mjs
```
catalog.mjs categories
catalog.mjs search <keywords...> [--categories a,b] [--kinds library,skill,mcp] [--limit 15] [--live]
catalog.mjs get <owner/repo> [--live]
```
By default the catalog uses the weekly stats snapshot shipped with the skill (`stats_source: snapshot <date>`): **zero GitHub calls**. That matters because users without a GitHub login only get 60 API calls an hour. `--live` refetches stats from GitHub; only use it when the user explicitly asks for fresh numbers.

### github.mjs
```
github.mjs search <keywords...> [--limit 20] [--min-stars 20]
github.mjs repo <owner/repo>        → found:false on 404, renamed:true if moved
github.mjs issues <owner/repo> [--limit 10]   → open issues sorted by 👍
```
Limits: 30 searches/min with a token (from `gh auth token` or `GITHUB_TOKEN`), 10/min without. `authenticated` in the output tells you which applies. If it's `false`, suggest `gh auth login` in the report.

### skills.mjs
```
skills.mjs search <keywords...> [--limit 30]
```
Signal: `signals.installs`. No descriptions: read the skill itself with `readme.mjs get <readme>` (the `readme` field is the skill folder inside its repo). The endpoint is undocumented: a failure means the source failed, not that no skills exist.

### plugins.mjs
```
plugins.mjs search <keywords...> [--limit 20]
```
Matches the official Claude plugin marketplace locally. Community plugins show up through GitHub and skills.sh.

### mcp.mjs
```
mcp.mjs search <keywords...> [--limit 20]
```
Smithery (signal: `uses`) plus the official registry (presence only). `sources_status` reports each one separately.

### npm.mjs · pypi.mjs
```
npm.mjs search <keywords...> [--limit 20]   → includes downloads_weekly
npm.mjs info <package>                      → license, github, downloads_weekly
pypi.mjs info <package>                     → license, github (no search API: find packages via web search)
```

### hn.mjs
```
hn.mjs search <keywords...> [--limit 20] [--tags story|show_hn|ask_hn|comment] [--since YYYY-MM-DD] [--by-date]
```
`url` is the HN discussion; `link` is the submitted URL.

### readme.mjs
```
readme.mjs get <owner/repo> [<owner/repo> ...] [--max-chars 5000] [--full]
```
Fetches READMEs from raw.githubusercontent.com (**no GitHub API calls**), follows monorepo README links, and condenses them to the intro plus feature, usage, limitation and comparison sections (install guides, badges, images and long code blocks are dropped). Pass several repos per call. Use `--full` only when the condensed version leaves a key question open.

Accepts `owner/repo/sub/path` for a skill or plugin folder inside a bigger repo (tries `SKILL.md` and `README.md` there, then the repo README). Output: `{ source: "readme", results: [{ id, found, source_url, chars_original, excerpt, headings }] }`. Read `excerpt`.

### score.mjs
```
score.mjs <evidence.json> [--dry-run] [--now YYYY-MM-DD]
```

## Recording source status

Add every source you used to `sources_status` in `evidence.json`: `"ok"`, `"skipped"` (not applicable for this form factor or mode), or `{ "failed": <error object> }`. Two or more failures make confidence low. Set `rate_limited: true` if a rate limit cut the search short.

## Not used

Reddit, X, Instagram, TikTok and LinkedIn are not built in (closed, paid or against their terms). If the environment already provides tools for them, they may be used as extra demand evidence, but never required.
