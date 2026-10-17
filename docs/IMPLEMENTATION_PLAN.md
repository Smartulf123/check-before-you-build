# check-before-you-build — Implementation Plan

> **Status:** Draft v0.1 · 2026-10-17 · for review
> **Companion to:** [SPEC.md](SPEC.md)
> **Launch target:** 2026-11-17 → 2026-11-24 (ahead of GummySearch's shutdown on 2026-12-01)

---

## Principles

1. **Build in thin vertical slices.** Get a rough end-to-end `/check` working early (Milestone 2), then deepen it. Don't perfect one phase in isolation.
2. **Facts from scripts, reasoning from the agent.** Every number comes from a script. The agent never invents data.
3. **Test against reality.** The evaluation set (SPEC §18) runs after every milestone from M3 on.
4. **No dependencies.** Node ≥ 20 built-ins only. That keeps install friction at zero.
5. **Small commits, clear messages.** Each milestone ends in a working, committed state.

## Timeline overview

| Week | Dates | Milestones |
|---|---|---|
| 0 | Oct 17–18 | M0: verify sources, repo skeleton |
| 1 | Oct 19–25 | M1: helper scripts · M2: first end-to-end `/check` (quick mode) |
| 2 | Oct 26–Nov 1 | M3: demand, gaps, building blocks · M4 (start): catalog foundation |
| 3 | Nov 2–8 | M4: catalog seeded to ~300 · M5: scoring, verification, report, card |
| 4 | Nov 9–16 | M6: evals passing, packaging, README, demo |
| 5 | Nov 17–24 | M7: launch |
| 6+ | weekly | Catalog updates (30–60 min/week) · v2 backlog |

Each milestone has **tasks**, **deliverables** and a **definition of done (DoD)**.

---

## M0 — Verify sources and set up the skeleton (Oct 17–18)

**Goal:** remove the unknowns from SPEC §21 before writing code that depends on them.

### Tasks

1. **Probe every source manually** and record the findings in `docs/sources-findings.md`:
   - GitHub search via `gh search repos … --json …` and via REST (unauthenticated + authenticated). Record the real rate limits seen in response headers.
   - GitHub issue search sorted by reactions.
   - **skills.sh**: find a stable way to search skills and read install counts (site search URL, page structure, or `npx skills find`).
   - **Official MCP registry**: confirm the endpoint, search parameter and response shape.
   - **Smithery / Glama / mcp.so**: API without a key, or web-search fallback.
   - **Claude plugin marketplaces**: list the marketplaces to index and the URLs of their manifest files.
   - **npm** search + downloads endpoints.
   - **PyPI** JSON metadata endpoint.
   - **HN Algolia** search endpoints.
2. **Create the repo skeleton** following SPEC §12 (empty files with headers where needed).
3. Add `package.json` (no dependencies; `"type": "module"`; scripts: `test`, `validate`, `eval`), `.gitignore`, `CHANGELOG.md`, `CONTRIBUTING.md` stub.
4. Set up CI (`.github/workflows/ci.yml`) running `node --test` (initially with no tests).

### Deliverables

- `docs/sources-findings.md` with a verified access method for every source, or a decision to drop or defer it
- Repo skeleton committed

### DoD

- Every row in SPEC §7 is marked ✅ verified, 🔁 fallback chosen, or ⏭️ deferred to v2
- SPEC updated where findings differ from assumptions
- CI runs green on an empty test suite

---

## M1 — Helper scripts (Oct 19–22)

**Goal:** reliable, tested data-fetching scripts that print clean JSON.

### Tasks

1. `scripts/lib/http.mjs`: fetch wrapper with timeout, retries, exponential backoff, rate-limit header handling, User-Agent.
2. `scripts/lib/cache.mjs`: per-run response cache in `check-reports/.cache/`.
3. `scripts/lib/gh.mjs`: detect `gh` and get a token via `gh auth token` (in memory only).
4. Source scripts, each with a `--help` and JSON output:
   - `github.mjs search <query> [--limit N]` · `github.mjs repo <owner/repo>` · `github.mjs issues <owner/repo> [--limit N]`
   - `npm.mjs search <query>` · `npm.mjs info <pkg>` (includes weekly downloads)
   - `pypi.mjs info <pkg>`
   - `mcp.mjs search <query>`
   - `skills.mjs search <query>`
   - `plugins.mjs search <query>`
   - `hn.mjs search <query> [--since YYYY-MM-DD]`
5. **Unit tests** with recorded fixtures (`tests/fixtures/*.json`). No network in tests.
6. A manual smoke-test script `tests/smoke.mjs` that hits the real APIs once each (not run in CI).

### Deliverables

- All source scripts working on Windows (primary dev machine) and in CI (Linux)

### DoD

- `node --test` passes
- `tests/smoke.mjs` returns real results from every v1 source
- Every script handles rate limits and network errors with a clear JSON error object and a non-zero exit code

---

## M2 — First end-to-end `/check`, quick mode (Oct 22–25)

**Goal:** a rough but complete run, from idea to verdict, so the whole pipeline exists early.

### Tasks

1. Write `SKILL.md` v0: frontmatter (`name`, trigger `description`), hard rules, quick-mode workflow.
2. Write `references/methodology.md` v0 covering phases 1, 2, 6 and 7 (simplified).
3. Write `references/sources.md` v0 explaining how to call each script.
4. Implement **Phase 1** (understand) and **Phase 2** (supply, GitHub only) via the skill instructions.
5. A minimal `score.mjs`: saturation formula only, with a placeholder verdict.
6. A minimal report template: verdict + competitor table + sources.
7. Install the skill locally in Claude Code and run it on eval case #1 (design extractor).
8. Decide the slash-command name (SPEC §21 Q5).
9. Purpose detection in Phase 1 (`--for fun|me|launch`, inferred, or default `launch`; SPEC §4.1). Record it in `evidence.json`.

### Deliverables

- `/check --quick "<idea>"` produces a `report.md` and `evidence.json`

### DoD

- On case #1, the report lists **designlang** and **dembrandt** with correct live stars
- No repo in the report fails a manual existence check

---

## M3 — Demand, gaps and building blocks (Oct 26–Nov 1)

**Goal:** the full research workflow in standard mode.

### Tasks

1. **Phase 3, demand:** HN search, competitor issue mining, web search instructions, demand item format.
2. **Phase 4, gaps:** gap statements with evidence; staleness detection.
3. **Phase 5, building blocks:** live search per component; license classification (`lib/license.mjs` mapping SPDX → class); the four recommendation types. The catalog lookup is stubbed until M4.
4. **Registry coverage in Phase 2:** wire in skills.sh, plugin marketplaces, the MCP registry, npm and PyPI according to form factor.
5. Write `references/subagents.md`: three briefs (supply, demand, building blocks), each with exact output JSON fragments.
6. Implement parallel sub-agent orchestration for Claude Code, with a sequential fallback for other agents.
7. Implement **standard** and **deep** mode budgets (SPEC §6.8).
8. Write `evals/cases.json` (cases 1–5) and `evals/check-eval.mjs`.

### Deliverables

- `/check "<idea>"` (standard) runs all phases except catalog-backed recommendations

### DoD

- Must-find recall ≥ 3/4 on cases 1–4 (target 4/4 by M6)
- Every demand item and gap has a URL
- License classes correct on a spot-check of 10 building blocks

---

## M4 — The catalog (Oct 29–Nov 8, overlaps M3/M5)

**Goal:** ~300 curated, validated entries across ~35 categories, plus the weekly maintenance tools.

### Tasks

1. `catalog/schema.json` (JSON Schema, SPEC §13.2) and `catalog/categories.json` (SPEC §8.4).
2. `scripts/catalog-validate.mjs`: schema, duplicate ids, valid categories, required fields, and a live check of the inclusion criteria (stars/downloads/license/activity).
3. `scripts/catalog-add.mjs <owner/repo> --category <slug>`: fetches metadata and drafts an entry (agent-assisted `use_for`/`why`) for human review.
4. `scripts/health.mjs`: checks every entry (archived, 404, license, inactivity, star drops), refreshes `catalog/.cache/stats.json` and writes `health-report.md`.
5. `scripts/scout.mjs`: candidate discovery (SPEC §8.5), writes `scout-report.md`.
6. `skills/.../scripts/catalog.mjs search|get`, used by phases 2 and 5.
7. **Seeding pipeline to reach ~300:**
   1. For each category, gather 15–25 candidates from awesome lists, skills.sh top lists, the MCP registry, GitHub search and the maintainer's own `dev\library`
   2. Run `catalog-add.mjs` in batch to draft entries
   3. `catalog-validate.mjs` drops anything failing the criteria
   4. **Maintainer review:** approve, edit or reject (the main human time cost, ~4–6 hours total, spread out)
   5. Commit per category: `catalog: add <category> (N entries)`
8. Wire the catalog into Phase 2 (whole-idea matches) and Phase 5 (catalog first).

### Deliverables

- ~300 entries in `catalog/entries/*.json`, all passing validation
- Scout and health tools working

### DoD

- `npm run validate` passes with ~300 entries
- Every category has ≥ 5 entries
- Running `/check` on case #1 recommends Playwright from the catalog as a 🧱 use block

---

## M5 — Scoring, verification, report and card (Nov 2–8)

**Goal:** trustworthy, rule-based verdicts and polished output.

### Tasks

1. Full `score.mjs`: saturation and demand formulas, gap cap, verdict rules 1–7, confidence levels (SPEC §9). Unit tests for every rule using synthetic evidence files.
2. `verify.mjs`: repo/package re-fetch, URL checks, drift correction, verification stats (SPEC §10). Unit tests.
3. Final `references/report-template.md` with all 10 sections (SPEC §11.1).
4. `card.mjs` → `card.html` (1200×630, light/dark, self-contained). Settle the card design (SPEC §21 Q6).
5. The chat summary format.
6. Language handling: detect the user's language, `--lang` override (SPEC §16).
7. Error handling for every row in SPEC §14.
8. Purpose-based output (SPEC §6.8, §9.7, §11.1): friendly verdict labels, the fun/me report variants, and the "My next build" card for fun mode. The wording rule ("never say don't build") is enforced in the template and checked by `check-eval.mjs`.

### Deliverables

- Complete outputs: `report.md`, `evidence.json`, `card.html`, chat summary

### DoD

- Every verdict rule covered by a passing unit test
- Fake repos injected into an evidence file are dropped by `verify.mjs`
- The card renders correctly in Chrome and Edge at 1200×630
- A Norwegian-language idea produces a Norwegian report
- `--for fun` and `--for me` produce the right variants with no verdict shown

---

## M6 — Evals, packaging and README (Nov 9–16)

**Goal:** launch-ready quality and presentation.

### Tasks

1. Choose control case #6 (open space) and finish `evals/cases.json`.
2. Run the full evaluation set and tune the weights and rules in `scoring.md` and `score.mjs` until the targets in SPEC §18.2 are met. Record the results in `evals/RESULTS.md`.
3. Packaging:
   - `.claude-plugin/plugin.json` + `marketplace.json`
   - Verify `npx skills add Smartulf123/check-before-you-build` on Claude Code, Codex and OpenCode
4. **README (final):** a one-line pitch, the verdict card image, a 30-second demo GIF, install commands, example prompts, how it works, catalog stats, privacy notes, roadmap, contributing.
5. **Dogfooding:** run `/check` on check-before-you-build itself; use the real card in the README.
6. `CONTRIBUTING.md`, the "suggest a repo" issue template, the PR template.
7. Tag `v1.0.0`; write release notes.

### Deliverables

- v1.0.0 release; a README with demo

### DoD

- Eval targets met (recall 100% on 1–4, verdict family ≥ 5/6, purpose cases 2/2, 0 hallucinated citations)
- A fresh install works on a clean machine via the skills CLI and the plugin marketplace
- A non-technical reader understands the README's top section in 10 seconds

---

## M7 — Launch (Nov 17–24)

**Goal:** maximum first-week reach. Research showed this category spreads via X, Reddit and GitHub Trending, not Hacker News.

### Tasks

1. **Launch assets:**
   - A 30–60 s demo video: idea in → verdict card out, using the "I almost built two things that already existed" story
   - An X thread (story + card + install line)
   - Reddit posts tailored to r/ClaudeCode, r/ClaudeAI, r/vibecoding, r/SideProject, r/indiehackers, each following that subreddit's rules
   - A short Show HN post with the existence check in the title (a low-expectation channel)
2. **The GummySearch angle:** a post or README section, "GummySearch is gone Dec 1 — here's a free, open-source way to check ideas", without claiming to be a full replacement.
3. Submit to awesome lists, skills.sh and plugin directories.
4. **Launch-day plan:** post everything within a few hours on one day (the star velocity that drives GitHub Trending); respond to every issue and comment within 24 h.
5. Week 1: fix bugs fast; publish the first weekly catalog update.

### DoD

- Launch posts live on all channels
- All launch-week issues triaged

---

## Ongoing — weekly catalog update (from Nov 25)

Target 30–60 minutes per week (SPEC §8.5):

1. `node scripts/scout.mjs` and `node scripts/health.mjs`
2. Review, approve or reject, and edit entries
3. `npm run validate`
4. `CHANGELOG.md` entry ("week N: +X / −Y")
5. Commit and push; optionally post a short "this week's additions" update on X

---

## v2 backlog (after launch, prioritised)

1. GitHub Action for the weekly `health.mjs` run → auto-opens an issue
2. `stack.md` user preferences (+ generate from a local library folder)
3. Catalog growth to 500+ (weekly + community PRs)
4. Optional connected sources (Reddit/X/YouTube via user MCPs); YouTube transcripts
5. PNG card export
6. "Good first issue" finder for 🤝 contribute recommendations
7. File/module-level building-block advice
8. Re-check diff ("what changed since the last report?")
9. `--private` mode
10. Codex / OpenCode marketplace packaging

---

## Time estimate (maintainer)

| Area | Estimate |
|---|---|
| M0 source verification | 2–3 h |
| M1–M3 scripts and skill | 12–18 h (mostly agent-assisted) |
| M4 catalog seeding review | 4–6 h of human review |
| M5 scoring, verification, output | 6–8 h |
| M6 evals, packaging, README | 6–8 h |
| M7 launch assets | 4–6 h |
| **Total to launch** | **~35–50 h over 5 weeks** (~7–10 h/week) |

The work project has priority on weekdays. This plan assumes mostly evenings and weekends.

## Decisions needed from the maintainer

| # | Decision | Needed by |
|---|---|---|
| 1 | Approve SPEC.md and this plan (or request changes) | before M0 |
| 2 | Slash-command name (`/check` vs alternatives) | M2 |
| 3 | Card visual style | M5 |
| 4 | Control case #6 | M6 |
| 5 | Launch date within Nov 17–24 | M6 |
