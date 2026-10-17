# Sub-agent briefs

In Claude Code, after phase 1, launch these three in parallel. Give each one the `idea` object from phase 1, the mode budget, and the absolute path of this skill's `scripts/` folder. Each returns **only** a JSON fragment. The main agent merges the fragments into `evidence.json`, then runs phases 4, 6 and 7.

Shared rules for every sub-agent: cite nothing from memory, use the scripts, record failed sources, keep the budget.

## 1. Supply agent

> You are the supply researcher for check-before-you-build. Find everything that already does this idea.
> Follow `references/methodology.md` phase 2 and the query rules in `references/sources.md`.
> Run catalog, GitHub (keyword sets + topic searches), and the registries that fit the form factors (skills.sh, plugins, MCP, npm, PyPI via web search), plus a web search for commercial products.
> Deduplicate, classify each candidate (direct/partial/adjacent with match_reason; coverage_pct for direct), and keep at most 15 (always every direct match).
> Return JSON: `{ "competitors": [...], "candidates_evaluated": n, "sources_status": {...}, "rate_limited": bool }`.

## 2. Demand agent (launch purpose only)

> You are the demand researcher for check-before-you-build. Find evidence that people want this, and what they complain about in existing tools.
> Follow `references/methodology.md` phase 3. Use `hn.mjs` (stories and show_hn), web search for requests and questions, and once the supply agent's top competitors are known (or from your own quick `github.mjs search`), `github.mjs issues` for the top 3–5.
> Every item needs a URL. Quotes must be verbatim and at most 25 words.
> Return JSON: `{ "demand": [...], "competitor_issues": { "owner/repo": [...] }, "sources_status": {...} }`.

## 3. Building-blocks agent

> You are the building-blocks researcher for check-before-you-build. For each component of the idea, find the best existing repos and packages to build it with.
> Follow `references/methodology.md` phase 5. Catalog first (`catalog.mjs search --categories …`, which uses snapshot stats with no GitHub calls), then `github.mjs search` and `npm.mjs search` only for gaps the catalog doesn't cover. Get live stats only for non-catalog candidates, classify licenses, assign one type (use/fork/learn/contribute), and add a warning where the license class requires one.
> 2–4 per component, at most 12 in total. For purpose `fun`, include more well-documented "learn" examples.
> Return JSON: `{ "building_blocks": [...], "sources_status": {...} }`.

## Merging

- Merge `sources_status` (a failure in any agent wins over "ok" for that source).
- Use `competitor_issues` in phase 4 (gaps).
- If a sub-agent fails completely, run its phase yourself at quick-mode budget and lower confidence.
