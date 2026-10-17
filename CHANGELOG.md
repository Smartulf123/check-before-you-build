# Changelog

All notable changes, including weekly catalog updates, are recorded here.

## Unreleased

### 2026-10-17
- Specification and implementation plan drafted (`docs/SPEC.md`, `docs/IMPLEMENTATION_PLAN.md`).
- Build purposes (fun / me / launch) and friendly verdict labels added to the spec.
- Milestone 0: every data source verified with real requests (`docs/sources-findings.md`); repository skeleton and CI added.
- Milestones 1–3: dependency-free fact scripts for GitHub, npm, PyPI, Smithery + MCP registry, skills.sh, the official plugin marketplace and Hacker News; catalog lookup; rule-based `score.mjs`; SKILL.md with methodology, sources, scoring, schema, report template and sub-agent briefs; eval set and checker. 43 unit tests plus a live smoke test. Eval case 1 (design extractor) passes end to end.
- Milestone 4 (tooling): catalog quality rules as code (`lib/criteria.mjs`: tiers, freshness, alternative signals, contributors, fake-star check, NOASSERTION license resolution via npm); 20 domains + 50 building-block categories with scout queries; maintainer tools `catalog-add`, `catalog-validate`, `health` and `scout`; catalog schema. 60 unit tests.
- **Catalog launch: 1,170 repos** across 50 categories (20 domains), every entry passing the quality rules, with up to 5 featured picks per category. Built from a topic harvest (2,662 candidates), parallel selection, a gap hunt for missing leaders, a big-repo safety net (≥ 10k stars by keyword), an independent five-agent review, and hand-verified licenses where detection fails.
- Ceiling raised to 50 per category (not a target); maintainer-pick exceptions (`exception`), labelled in reports; health and live validation pause at GitHub's rate limit; the skill uses the weekly stats snapshot for catalog entries instead of live API calls.
