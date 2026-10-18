# Changelog

All notable changes, including weekly catalog updates, are recorded here.

## v1.2.0: 2026-10-18

Changes from the second real-world test.

- **Skills for your coding agent.** Every report now recommends 3 to 6 agent skills matched to the stack: a design skill when there is a user interface, the official skill for each framework or service, and at most one workflow skill. The skills are read before they are recommended, and `verify.mjs` flags any that were not.
- **Products worth studying.** Up to three real apps or websites that do the idea well, with what to look at and how to study it (design extractors for websites, REA for desktop and Android apps, screenshots for iOS). Links are checked; unreachable ones are labelled.
- **No build plan.** The report ends with a short next step and points to planning skills such as brainstorming, so it stays focused and shorter.
- **Cleaner writing.** A plain header sentence instead of a dotted status line, no "·" separators, and stars and license in their own columns.
- **Fix: edited licenses.** `readme.mjs license` reported MIT for MIT text rewritten as "non-commercial only". Such licenses are now reported as `custom-restricted`.

## v1.1.0: 2026-10-18

Changes from the first real-world test (a personal health tracker website).

- **The report is the deliverable and a full build guide.** New sections: a recommended stack with a top pick and an alternative for every layer the project type needs (taken from the catalog's domain map), building blocks per feature, and a numbered build plan from setup to going online. The verdict card (`card.mjs`, `card.html`) was removed.
- **Parallel research.** Starting the supply, demand and building-block sub-agents is now an explicit workflow step in Claude Code.
- **Plain language.** No emojis in reports, labels or the README. Writing rules adapted from Humanizer (MIT): no dashes as connectors, no staged openers, no sales words.
- **Better coverage for personal and learning projects.** Mainstream apps and the most popular self-hosted option are always listed; tables are ordered by match, then popularity. Search terms include related words (a health tracker is also a fitness and nutrition tracker), which would have found wger.
- **Look and feel.** Requests for a fancy, premium or animated result add picks from animation, creative coding and 3D (for example Scrollcraft).
- **Study the competition.** When the closest competitor is closed or the user names a reference app, the report suggests REA and the design extractors for studying it.
- **Fix: scripts no longer exit silently when the skill is installed as a link.** Skills are often installed as a symlink or junction; every script compared the link path with the real path and quietly did nothing. Both paths are now resolved first, with a regression test.
- **No verdict for fun and personal projects.** Previously a meaningless verdict was computed and stored behind the scenes.
- **License check.** `readme.mjs license` reads a repo's license file and detects common licenses when GitHub reports none. Free licenses that allow commercial use (such as GSAP's) may be recommended for use.

## v1.0.0: 2026-10-17

### Catalog refresh
- **1,907 repos in 62 categories** (was 1,175 in 50). Every repo with 3,000+ stars created since September 2025 was triaged (1,257 candidates), live-checked against the quality rules, and described from its README with a verbatim quote that was verified automatically (766 of 768 passed). 732 were added.
- Excluded on purpose: awesome lists, courses, prompt collections, consumer apps, tools that pool subscriptions or route around provider terms, non-commercial and source-available licenses, and abandoned projects.
- The agent area was split so the 50-per-category ceiling still holds: agent frameworks, coding agents and harnesses, agent workbenches, personal assistants, agent memory and context, agent sandboxes and runtimes, agent apps; dev workflow skills, framework and platform skills, skill tooling, docs and slides skills, design and media skills, business and marketing skills, research and knowledge skills.
- 17 lower-ranked repos did not fit in categories that were already full (dev tooling, data science, RAG, AI SDKs).

### Skill and scoring (M6)
- Eval set run end to end by fresh agents; results and tuning in `evals/RESULTS.md`.
- Scoring: GitHub issues weighted by thumbs-up, demand older than 3 years counts a third, gap capped by evidence, CONTRIBUTE and FORK need an adopted project, extreme saturation with minor gaps is "already well covered".
- Search: five-angle search terms with aliases, relevance-first catalog ranking, nested skill folders found through the repo tree, compact script output.
- Plugin packaging (`.claude-plugin/`), README with a real example and verdict card.

## Before v1.0.0

### 2026-10-17
- Specification and implementation plan drafted (`docs/SPEC.md`, `docs/IMPLEMENTATION_PLAN.md`).
- Build purposes (fun / me / launch) and friendly verdict labels added to the spec.
- Milestone 0: every data source verified with real requests (`docs/sources-findings.md`); repository skeleton and CI added.
- Milestones 1–3: dependency-free fact scripts for GitHub, npm, PyPI, Smithery + MCP registry, skills.sh, the official plugin marketplace and Hacker News; catalog lookup; rule-based `score.mjs`; SKILL.md with methodology, sources, scoring, schema, report template and sub-agent briefs; eval set and checker. 43 unit tests plus a live smoke test. Eval case 1 (design extractor) passes end to end.
- Milestone 4 (tooling): catalog quality rules as code (`lib/criteria.mjs`: tiers, freshness, alternative signals, contributors, fake-star check, NOASSERTION license resolution via npm); 20 domains + 50 building-block categories with scout queries; maintainer tools `catalog-add`, `catalog-validate`, `health` and `scout`; catalog schema. 60 unit tests.
- **Catalog launch: 1,170 repos** across 50 categories (20 domains), every entry passing the quality rules, with up to 5 featured picks per category. Built from a topic harvest (2,662 candidates), parallel selection, a gap hunt for missing leaders, a big-repo safety net (≥ 10k stars by keyword), an independent five-agent review, and hand-verified licenses where detection fails.
- Ceiling raised to 50 per category (not a target); maintainer-pick exceptions (`exception`), labelled in reports; health and live validation pause at GitHub's rate limit; the skill uses the weekly stats snapshot for catalog entries instead of live API calls.
- README-based descriptions for all 1,170 catalog entries (`summary`, `best_for`, `not_for`, `keywords`). A grounding check found two batches written largely from memory; 279 entries were redone with a verbatim README quote as proof, and 278 of 279 quotes were verified automatically against the README.
- Tiers removed: one quality gate plus hand-curated featured picks. `readme.mjs` reads READMEs via raw.githubusercontent.com (no API calls), including reStructuredText, AsciiDoc and `.github/README.md`; the skill must read the README of every shortlisted repo before recommending it.
- Milestone 5: `verify.mjs` fact-checks evidence before the report (missing repos dropped, renames fixed, drifted numbers corrected, dead links dropped or labelled, catalog entries verified from the snapshot with no API calls, unread READMEs flagged); `card.mjs` renders a self-contained 1200×630 verdict card in launch / fun / me variants with light and dark themes; report template and skill workflow updated.
