# Evaluation results

Each case is run end to end by a fresh agent that gets only the user's message and the skill. It has no hints about the expected competitors or verdict. The resulting `evidence.json` is graded with:

```bash
node evals/check-eval.mjs <case-id> <evidence.json>
```

A case passes when every `must_find` project appears among the competitors, the purpose is detected correctly, and the verdict (computed by `score.mjs`) is one of the expected ones. For fun and me runs, no verdict may be shown.

## v1.0.0: 2026-10-17

| # | Case | Purpose | Must find | Verdict | Result |
|---|---|---|---|---|---|
| 1 | Design extractor skill | launch | 2/2 (13 direct found) | DROP | ✅ |
| 2 | Wrapped for coding agents | launch | 2/2 | CONTRIBUTE | ✅ |
| 3 | Social deep-research skill | launch | 1/2 | CONTRIBUTE | ❌ missed Agent-Reach |
| 4 | Idea checker skill (this project) | launch | 2/2 | BUILD_WITH_ANGLE | ✅ |
| 5 | Todo web app (control: crowded) | launch | 13 competitors | DROP | ✅ after tuning |
| 6 | Norwegian accessibility audit skill (control: niche) | launch | – | BUILD_WITH_ANGLE | ✅ |
| 7 | Todo app to learn React | fun | – | hidden | ✅ |
| 8 | Recipe organizer for myself | me | – | hidden | ✅ |

**7 of 8 pass.** Case 3 found last30days and landed on an expected verdict, but missed Agent-Reach (98.6k ⭐). The agent searched "X" instead of "Twitter", and the repo was not in the catalog. Both are fixed: the search checklist now asks for alternative names, and Agent-Reach is in the catalog. The case has not been rerun since.

Every run also passed the fact-check: all cited repos, packages and links existed, with 0 corrections and 0 drops across the runs.

## What the runs changed

Wave 1 (cases 1–4, before tuning) passed 2 of 4. The failures and the fixes:

- **Missed competitors** (cases 2 and 4): the agent searched only in the user's words. Search terms now cover five angles: the user's words, developer jargon, business words, the problem, and bigger tools that might include the idea as a feature. Every direct match is kept.
- **CONTRIBUTE to a tiny repo**: joining or forking now requires real adoption (popularity ≥ 0.6, about 250+ stars or equivalent).
- **Inflated demand**: GitHub issues are weighted by 👍 (0.3 / 0.6 / 1.5). Items older than 3 years count a third. Background pages (laws, statistics) are context, not demand.
- **Gut-feel gap scores**: the gap score is capped by the number of evidenced gap statements (none → 2, one → 6, two or three → 8).
- **Marketplace stars**: a plugin inside a big marketplace repo no longer inherits that repo's stars.

Wave 2 (cases 2, 4–8, after tuning):

- **Case 5 returned CONTRIBUTE for a todo app** (saturation 10, gap 4). Rule 2 now also treats saturation ≥ 9 with only minor gaps (< 5) as "already well covered". All other cases keep an expected verdict under the new rule.
- **Case 2's expected verdicts were widened to include CONTRIBUTE.** The run found, and confirmed from its README, that tokscale (5.7k ⭐, active, MIT) already ships a `wrapped` command. That is the honest answer.
- **Catalog search** ranked featured entries above better matches; it now ranks by relevance first. axe-core, pa11y, Satori and resvg-js were added.
- **README reading**: skills.sh results now carry the skill's folder path. A sub-path that falls back to the repo README is flagged. Symlinked READMEs in `.github/` are resolved correctly.
- **Card**: the footer lists only the sources actually used, and fun and me runs never return a verdict.

## Known limits

- **The catalog under-covers 2026's agent wave.** A check of repos with 15k+ stars created since September 2025 found most of them missing from the catalog. Live GitHub search still finds them, but the catalog-first step does not. A catalog refresh for recent repos is the top follow-up.
- `coverage_pct` and `gap_score` are still the agent's judgement. The rules cap them by evidence, but a borderline coverage estimate (around 80 %) can still decide between CONTRIBUTE and BUILD_WITH_ANGLE.
- The catalog holds building blocks, not end-user apps. For app ideas, competitors come from GitHub and web search.
- GitHub's search limit is shared across everything using the same token. Parallel runs can hit it; the scripts wait for the reset.
- Some agent harnesses don't let sub-agents write files. The skill then prints the report in the chat.
