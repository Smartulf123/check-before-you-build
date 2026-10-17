---
name: check-before-you-build
description: Checks whether a software idea already exists and what to build it with, before the user starts building. Searches GitHub, skills.sh, Claude plugins, MCP registries, npm/PyPI and Hacker News, and returns a cited verdict plus reusable repos. Use when the user asks "does this already exist?", "should I build X?", "is anyone doing X?", "what can I build X with?", "check this idea", or describes a project they are about to start and wants to know what's out there.
---

# check-before-you-build

Answer two questions with evidence: **Is this worth building?** and **What can it be built with?**

The agent reasons. The scripts in `scripts/` fetch facts. Numbers always come from scripts, never from memory.

## Hard rules (always apply)

1. **Never cite from memory.** Every repo, package, skill, server or link in the output must come from a script or tool result in *this* run. Memory may suggest search keywords only.
2. **The verdict comes from `score.mjs`.** Never invent, change or soften a verdict by hand. If `score.mjs` fails, report the error and stop.
3. **Never tell the user not to build.** Describe the landscape and let them decide (purpose rules in `references/methodology.md` §Purpose).
4. **Every demand item and gap needs a URL.** No source, no claim.
5. **Stay within the mode budget** (table below). Report thin or failed sources honestly. Absence of evidence is not evidence of absence.
6. **Answer in the user's language** (detected from the idea, or `--lang`). Keep repo names, numbers and URLs as-is.
7. **Read the README before recommending.** Never recommend, rank or reject a repo as a building block or name it as a closest competitor without reading its README in this run (`readme.mjs get`). Stored descriptions are for *finding* candidates; READMEs are for *choosing*. Read a broad shortlist (see the mode table), not just the final picks. `readme.mjs` uses raw.githubusercontent.com, so it costs no GitHub API calls.
8. **Read-only.** Never star, fork, open issues, post or install anything.

## Invocation

```
/check-before-you-build "<idea>"            standard mode (~5 min)
/check-before-you-build --quick "<idea>"    catalog + GitHub + verdict (~2 min)
/check-before-you-build --deep "<idea>"     more queries and issue mining (~8 min)
  --for fun | me | launch                   why they're building (default: inferred, else launch)
  --lang <code>                             force the report language
```

The skill also triggers from plain requests such as "check if this already exists: …".

## Running the scripts

Scripts live in the `scripts/` folder next to this file. Run them with Node ≥ 20:

```
node <this-skill-dir>/scripts/<script>.mjs <command> [args] [--flags]
```

Each script prints **one JSON object**: `{ "ok": true, ... }` or `{ "ok": false, "error": {...} }` with exit code 1. A failed source is recorded in `sources_status` and the check continues. See `references/sources.md` for every command and the query-writing rules.

| Script | Use |
|---|---|
| `catalog.mjs search <keywords> --categories a,b` | Curated repos (checked first; uses the weekly stats snapshot, no GitHub calls) |
| `github.mjs search <2–4 keywords>` · `repo <owner/repo>` · `issues <owner/repo>` | Competitors, live stats, unmet demand |
| `skills.mjs search <keywords>` | Existing agent skills (installs) |
| `plugins.mjs search <keywords>` | Official Claude plugins |
| `mcp.mjs search <keywords>` | MCP servers (Smithery + official registry) |
| `npm.mjs search` · `info <pkg>` · `pypi.mjs info <pkg>` | Packages |
| `hn.mjs search <keywords> [--tags show_hn]` | Hacker News demand and launches |
| `readme.mjs get <owner/repo> [...]` | Condensed READMEs (intro, features, usage, limitations); no API calls |
| `verify.mjs <evidence.json>` | Fact-check: drops missing repos/links, fixes renames and numbers (required) |
| `score.mjs <evidence.json>` | Scores and verdict (required) |

## Workflow

Follow `references/methodology.md` for the full detail of each phase.

1. **Understand** the idea: summary, form factors, target user, **purpose**, search terms from five angles plus related words, 2–6 components, the **stack layers** the project type needs (`catalog.mjs domains`), a **look-and-feel** layer when the user asks for a fancy, premium or animated result, and any **reference apps** the user names. Ask one clarifying question only if nothing searchable can be derived.
2. **Research in parallel.** In Claude Code, start **three sub-agents in one message** with the Agent tool, using the briefs in `references/subagents.md`: supply (existing projects), demand (launch only; skip it for fun and me) and building blocks (every layer and component). Pass each one the `idea` object from step 1, the mode and the absolute path of this skill's `scripts/` folder, then wait for all of them and merge their JSON. Only if you have no sub-agent tool, or you are already a sub-agent, do phases 2, 3 and 5 of the methodology yourself, in that order.
3. **Gaps** (launch: full · me: short · fun: skip): evidenced weaknesses and unmet requests.
4. **Check facts, then score:** write `evidence.json` (schema in `references/evidence-schema.md`) and run `verify.mjs evidence.json`. It drops repos and links that don't exist, fixes renames and drifted numbers, uses the snapshot for catalog entries (no GitHub calls), and lists shortlisted repos whose README you haven't read: read those, then verify again. Then run `score.mjs evidence.json` once.
5. **Write** `report.md` from `references/report-template.md`, following `references/writing.md` (plain language, no emojis). It is the one complete deliverable: a build guide the user can follow. If you can't write files, print the report in the chat. Then print the short chat summary.

## Mode budgets

| | quick | standard | deep |
|---|---|---|---|
| Keyword sets searched | 4 | 8 | 15 |
| GitHub results per query | 10 | 20 | 30 |
| Registries | catalog + GitHub | all applicable | all applicable |
| Demand | competitor adoption only | HN + web | HN + web + issues of top 5 |
| Competitor issue mining | none | top 3 | top 5 |
| Building blocks | catalog only | catalog + live | catalog + live, more candidates |
| READMEs read (per layer or component) | top 2 | top 3 | top 5 |
| READMEs read (competitors) | all direct | all direct + partial | all direct + partial |

Purpose adjusts this further: `fun` and `me` skip demand; `fun` also skips gaps and adds more projects to learn from.

## Output

Write to `check-reports/<YYYY-MM-DD>-<idea-slug>/` in the current working directory:

- `report.md`: the full report and build guide (`references/report-template.md`)
- `evidence.json`: everything collected, plus the verification and scores written by `verify.mjs` and `score.mjs`

Then print the chat summary from the template: the headline, the closest existing project, the recommended stack in one line, the next step and the path to the report.
