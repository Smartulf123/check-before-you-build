# Methodology: the 7 phases

Detailed instructions for each phase. SKILL.md has the summary and hard rules.

## Purpose

Building something that already exists is fine. The skill informs, it never forbids.

| Purpose | Signals in the idea text | Effect |
|---|---|---|
| `fun` | "for fun", "to learn", "practice", "side project", "hobby" | No verdict shown. Skip demand and gaps. Emphasise projects to learn from and building blocks. |
| `me` | "for myself", "my own use", "for my team", "personal tool" | No verdict shown. Skip demand; short gaps. Hint at existing tools that might save time. |
| `launch` | "launch", "publish", "users", "sell", "viral", "startup", "open source it", "share on social media", "get stars" | Full verdict with friendly label. |

Priority: `--for` flag → inferred from the text → default `launch`. Record `purpose_source` as `explicit`, `inferred` or `default`. With `default`, end the summary with: *"Just building for fun, to learn or for yourself? Ignore the verdict, and the building blocks below are for you."*

## Phase 1: Understand

Produce the `idea` object:

- `summary`: one sentence: what it is, for whom, in what form.
- `form_factors`: from `skill`, `plugin`, `mcp`, `cli`, `library`, `web-app`, `desktop-app`, `mobile-app`, `browser-extension`, `api`, `template`.
- `target_user`.
- `purpose`, `purpose_source`.
- `search_terms`: short keyword sets (2–4 words each), **not sentences**. Competitors are most often missed because they describe the same thing in different words, so cover **all five angles**:
  1. **The user's own words**, plus other names for the same things (X = Twitter, HN = Hacker News, LLM = AI model): `invoice generator freelancers`
  2. **Developer jargon**: `pdf invoice library`, `invoice template engine`
  3. **Business or market words**: `billing software small business`, `invoicing saas`
  4. **The problem itself**: `get paid faster`, `track unpaid invoices`
  5. **Bigger tools that may include this as a feature**: `accounting app`, `time tracking billing`. A recap card might live inside a usage tracker, an idea checker inside a startup-validation skill. Read those READMEs for the feature.

  Example for "a CLI that turns time logs into invoices": `invoice generator cli`, `time tracking invoice`, `billing cli freelancers`, `invoicing open source`, `time tracker`, `topic:invoice`. Search terms are discovery hints only; never cite a project because you remember it.
- `components`: 2–6 technical building blocks ("headless browser automation", "computed CSS extraction", "markdown generation").
- `categories`: catalog category slugs for the idea and its components (`node scripts/catalog.mjs categories`).

Ask one clarifying question only if no meaningful keywords can be derived (e.g. "an app"). Otherwise continue without asking.

## Phase 2: Supply

1. `catalog.mjs search <keywords> --categories <slugs>`. Entries matching the *whole idea* are competitor candidates. Entries matching a component go to phase 5. The catalog holds building blocks, so for end-user apps (a todo app, a recipe site) expect few competitor hits there: find those through GitHub and web search.
2. `github.mjs search` for each keyword set within budget, plus 1–2 `topic:<slug>` searches. Keep the default `stars:>20` filter. Lower it with `--min-stars 0` only when results are empty.
3. Registries by form factor:
   - skill / plugin → `skills.mjs search`, `plugins.mjs search`
   - mcp → `mcp.mjs search`
   - library / cli (JS) → `npm.mjs search`
   - library / cli (Python) → web search `site:pypi.org <keywords>`, then `pypi.mjs info <pkg>`
   - any → web search for commercial products: `<concept> tool`, `<concept> alternative`, `<concept> app`
4. Deduplicate: the same project often appears as a GitHub repo, an npm package and a skill. Merge them under the GitHub id and keep each source's signal in `other_signals`.
5. **Read the READMEs** of the strongest candidates before classifying them: `readme.mjs get <owner/repo> <owner/repo> …` (several at once). Classify direct/partial matches from what the README says the project does, not from its name or one-line description. Budget: see the mode table in SKILL.md.
6. Classify every candidate:
   - `direct`: does essentially the same job for the same user
   - `partial`: big overlap but differs in form, scope or audience
   - `adjacent`: related, a building block or neighbour
   Give `match_reason` (one line) for every direct/partial match. Estimate `coverage_pct` (0–100) for direct matches: list the idea's 3–6 core features (from `summary` and `components`), check each against the README, and set coverage to the share it delivers. Write the covered and missing features in `match_reason`. Rule 3 (CONTRIBUTE) needs ≥ 80, so only go that high when the README shows nearly every core feature.
7. Keep **every direct match**, even if there are more than 15, plus partial and adjacent matches up to 15 entries in total, ranked by relevance × popularity. Set `candidates_evaluated` to the number of distinct projects whose description or README you actually judged (not raw search hits), and `readme_read: true` on each competitor whose README you read. Products without a public repo (commercial sites) don't need `readme_read`; read their site instead.

**Judge relevance yourself.** npm and skills.sh rank by popularity, and GitHub search returns spam. Read descriptions. Fetch a README with web fetch when unsure.

## Phase 3: Demand (launch only)

1. `hn.mjs search <keywords>` for the concept, and `--tags show_hn` for similar launches (points show how launches performed). Count a launch as demand only when it is the same concept; a launch of a broader tool (a general research agent for a social-research idea) is context, not demand.
2. `github.mjs issues <owner/repo>` for the top 3 (standard) or 5 (deep) direct/partial competitors. Feature requests and complaints are unmet demand. Titles matter even with few 👍.
3. Web search: "how do I …", "is there a tool that …", forum and blog posts asking for this. A demand item must show people wanting, asking for or complaining about something. Background pages (laws, statistics, news about a market) are context: mention them in the report, but don't add them to `demand`.
4. Each item: `type` (`hn_story` for anything on HN, including Ask HN | `github_issue` | `request` | `forum` | `web`), `date` (items over 3 years old count a third), `title`, `url`, `date`, engagement (`points`, `reactions_plus1`, `comments`; leave a field out when it's unknown, don't guess), and a verbatim `quote` of at most 25 words when there is one. An issue with no 👍 counts for little; prefer evidence that several people want the thing.

Competitor adoption is added automatically by `score.mjs`. Don't list it as a demand item.

## Phase 4: Gaps

- launch: full. me: short ("what existing tools lack, if you want it your way"). fun: skip.
- Collect weaknesses of the top competitors from READMEs (limitations sections), open issues and complaints.
- Unmet requests: demand items that no direct competitor satisfies.
- Stale competitors: archived, or no push in over 12 months.
- Write 1–4 gap statements. Each needs `evidence` (URLs) and `checked` (where you confirmed the competitors lack it, e.g. "competitor-a README", "competitor-b issues").
- "Better UX" is not a gap unless users complain about the UX.
- Set `gap_score` (0–10) from the rubric in `scoring.md`. `score.mjs` caps it by the evidence: no evidenced gap → 2, one → 6, two or three → 8, four or more (or no active direct competitor) → 10. So write a separate statement for each distinct gap you can evidence.

## Phase 5: Building blocks

1. Catalog first: `catalog.mjs search <component keywords> --categories <slug>`. Catalog entries come with stats from the weekly snapshot (`stats_source`) and are already quality-checked, so **don't spend GitHub calls on them**. Prefer `featured` entries.
2. Live search only for components the catalog doesn't cover well: `github.mjs search`, `npm.mjs search`.
3. Get live stats only for candidates **outside** the catalog (`github.mjs repo`, `npm.mjs info`).
4. **Read the README of every shortlisted candidate** (top 5 / 10 / 15 per component by mode, catalog entries included): `readme.mjs get a/b c/d …`. Use the catalog's `summary`, `best_for` and `not_for` fields to build the shortlist, and the README to confirm the fit: does it do what this idea needs, in the user's stack, and without the limitation that would rule it out? Drop candidates the README shows don't fit, even if they're featured. Set `readme_read: true` on each block you recommend.
5. Rank by fit → maintenance → adoption → license.
6. One recommendation type per block: `use` 🧱 · `fork` 🍴 · `learn` 💡 · `contribute` 🤝.
7. License classes: permissive (MIT, Apache-2.0, BSD, ISC, MPL-2.0, Unlicense, CC0-1.0, 0BSD, Zlib) → any type. Copyleft (GPL/AGPL/LGPL) → use/learn/contribute; fork only with a warning. None → learn only ("no license: you have no right to copy this code"). Other → learn only.
8. 2–4 blocks per component, at most 12 in total. For `fun`, include more 💡 learn examples (well-documented projects worth reading).

## Phase 6: Check facts, then score

Write `evidence.json` following `evidence-schema.md`. Set `rate_limited: true` if a rate limit cut any search short even after retrying (a pause that recovered doesn't count). Then:

```
node <skill-dir>/scripts/verify.mjs check-reports/<dir>/evidence.json
node <skill-dir>/scripts/score.mjs  check-reports/<dir>/evidence.json
```

Verify first: it drops what doesn't exist and refreshes the numbers that scoring uses (details in phase 7). If verify lists `readme_missing`, read those READMEs, set `readme_read: true`, and run verify again before scoring. `score.mjs` validates the file, computes saturation, demand and gap, applies verdict rules 1–7 and writes the result back. If it reports `ValidationError`, fix the evidence and run it again. Never write the verdict yourself.

## Phase 7: Write

What `verify.mjs` (run in phase 6) does:
- verifies catalog entries from the weekly snapshot (no GitHub calls)
- re-fetches every other GitHub repo (`github:` ids) and npm package: missing → `verified: false`; renamed → id and URL updated; numbers refreshed, with > 10 % drift logged as corrections. Skills, plugins and MCP servers that live inside a bigger repo keep their own signals (they never inherit the host repo's stars).
- checks demand and product URLs: dead demand links are dropped, unreachable product sites are kept with `link_status: "unreachable"`
- writes `verification: { checked, passed, corrected, dropped }` into the file
- lists `readme_missing` for shortlisted items that have a README you haven't read

Then:
1. Write `report.md` from `report-template.md`, using only items with `verified !== false`. Mention any corrections or dropped items in "Method and coverage". If your environment doesn't let you write files, print the full report in the chat instead.
2. Run `node <skill-dir>/scripts/card.mjs check-reports/<dir>/evidence.json` to write `card.html`.
3. Print the chat summary, including the report and card paths.
