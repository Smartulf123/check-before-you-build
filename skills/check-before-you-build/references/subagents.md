# Sub-agent briefs

In Claude Code, right after phase 1, start these sub-agents **in a single message** with the Agent tool so they run at the same time: supply and building blocks always, demand only for the `launch` purpose. Give each one:

- the `idea` object from phase 1 (including `search_terms`, `components`, `layers`, `look_and_feel` and `references`),
- the mode and its budget from SKILL.md,
- the absolute path of this skill's `scripts/` folder and of `references/`,
- the brief below, word for word.

Each returns **only** a JSON fragment. Wait for all of them, merge the fragments into `evidence.json`, then run phases 4, 6 and 7 yourself.

Shared rules for every sub-agent: cite nothing from memory, use the scripts, record failed sources, keep the budget, and **read the README (`readme.mjs get`) of every repo before you classify or recommend it**. Reading READMEs is the main reason to use sub-agents: it keeps the main agent's context small.

## 1. Supply agent

> You are the supply researcher for check-before-you-build. Find everything that already does this idea.
> Follow `references/methodology.md` phase 2 and the query rules in `references/sources.md`. Search with the user's words and with the related words of the domain (a health tracker is also a fitness, workout, nutrition and sleep tracker).
> Run catalog, GitHub (keyword sets + topic searches), and the registries that fit the form factors (skills.sh, plugins, MCP, npm, PyPI via web search), plus a web search for commercial products.
> For purpose `me` or `fun`, always include the best-known mainstream apps and the most popular self-hosted project in the space.
> Also pick up to 3 real products worth studying (methodology phase 5, step 5) from what you found, with what to look at and how to study it.
> Deduplicate, classify each candidate (direct/partial/adjacent with match_reason; coverage_pct for direct), and keep at most 15 (always every direct match).
> Return JSON: `{ "competitors": [...], "inspiration": [...], "candidates_evaluated": n, "sources_status": {...}, "rate_limited": bool }`.

## 2. Demand agent (launch purpose only)

> You are the demand researcher for check-before-you-build. Find evidence that people want this, and what they complain about in existing tools.
> Follow `references/methodology.md` phase 3. Use `hn.mjs` (stories and show_hn), web search for requests and questions, and once the supply agent's top competitors are known (or from your own quick `github.mjs search`), `github.mjs issues` for the top 3–5.
> Every item needs a URL. Quotes must be verbatim and at most 25 words.
> Return JSON: `{ "demand": [...], "competitor_issues": { "owner/repo": [...] }, "sources_status": {...} }`.

## 3. Building-blocks agent

> You are the building-blocks researcher for check-before-you-build. Cover the whole stack.
> Follow `references/methodology.md` phase 5:
> - for every entry in `layers`, a top pick and one alternative that work together (catalog first: `catalog.mjs search <keywords> --categories <slug>`);
> - for every entry in `components`, 2–3 candidates;
> - if `look_and_feel` is set, 2–3 picks from animation, creative-coding and 3d-graphics that match the user's words;
> - 3–6 agent skills for the user's coding agent that match the stack (methodology phase 5, step 4): a design skill when there is a UI, the official skill for each picked framework or service, at most one workflow skill.
> Use `github.mjs search` and `npm.mjs search` only where the catalog is thin, and live stats only for non-catalog candidates. Classify licenses, assign one type (use/fork/learn/contribute), record `layer` or `component` and `role` (pick/alternative), and add a warning where the license class requires one. At most 25 blocks. For purpose `fun`, add well-documented projects worth reading as `learn`.
> Return JSON: `{ "building_blocks": [...], "sources_status": {...} }`.

## Merging
- Merge `sources_status` (a failure in any agent wins over "ok" for that source).
- Use `competitor_issues` in phase 4 (gaps).
- If a sub-agent fails completely, run its phase yourself at quick-mode budget and lower confidence.
