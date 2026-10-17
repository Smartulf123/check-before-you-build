# check-before-you-build — Specification

> **Status:** Draft v0.6 · 2026-10-17 · for review
> **v0.6:** up to 20 entries per category with up to 5 `featured`; `license_verified` for hand-checked licenses (§8.2)
> **v0.5:** catalog quality rules decided (tiers, freshness, alternative signals, contributors, fake-star check; §8.2–8.3); 20 domains + 50 building-block categories (§8.4)
> **v0.4:** catalog moved inside the skill folder (§12) so installed copies include it; popularity takes the strongest normalised signal across sources (§9.1)
> **v0.3:** sources verified in M0. §7 rewritten with real endpoints and query-writing rules (§7.1); Smithery added; Glama deferred; open questions 1–3 resolved
> **v0.2:** added build purposes (fun / for me / launch) and friendlier verdict labels: §4.1, §6.1, §6.6, §6.8, §9.7, §11.1, §13.1, §18, §19
> **One-liner:** An open-source agent skill that answers *"Is this worth building — and what can I build it with?"* with hard, cited evidence in a few minutes.

---

## Table of contents

1. [Problem](#1-problem)
2. [Goals and non-goals](#2-goals-and-non-goals)
3. [Users](#3-users)
4. [User experience](#4-user-experience)
5. [System overview](#5-system-overview)
6. [The research workflow (7 phases)](#6-the-research-workflow-7-phases)
7. [Sources](#7-sources)
8. [The catalog](#8-the-catalog)
9. [Scoring and verdict](#9-scoring-and-verdict)
10. [Fact-checking](#10-fact-checking)
11. [Output: report, evidence file, verdict card](#11-output-report-evidence-file-verdict-card)
12. [Architecture and file layout](#12-architecture-and-file-layout)
13. [Data formats](#13-data-formats)
14. [Error handling and degradation](#14-error-handling-and-degradation)
15. [Safety, privacy and terms of service](#15-safety-privacy-and-terms-of-service)
16. [Language](#16-language)
17. [Portability and installation](#17-portability-and-installation)
18. [Evaluation](#18-evaluation)
19. [Version 1 vs version 2](#19-version-1-vs-version-2)
20. [Risks](#20-risks)
21. [Open questions](#21-open-questions)

---

## 1. Problem

Building software is now cheap. Vibe coders and indie developers can ship a project in a weekend, so the expensive mistake is no longer *how* to build. It is building something that already exists, or that nobody wants.

Existing help falls short:

| Existing tool type | Examples | What's missing |
|---|---|---|
| Business idea validators | IdeaBrowser, ValidatorAI, DimeADozen, startup-skill | They write LLM opinion about market size, personas and pitch. They are weak on hard evidence and **don't check GitHub or the agent ecosystem**. Many tell every idea it's great. |
| "Does it exist?" checkers | idea-reality-mcp (maintenance mode), githubpill, kitbash | GitHub-only scores. **No demand evidence**, no verdict with reasoning, no building-block advice. |
| Demand / social research | last30days, Reddit pain-point miners | Find conversations, but **don't validate an idea or check for existing implementations**. |
| General deep research | Claude Research, ChatGPT Deep Research, GPT Researcher | Not structured around this question. No star counts, last-commit dates, licenses or registry coverage. |

**Nobody checks skills.sh, Claude plugin marketplaces or MCP registries**, which is where a growing share of builder tools now live. Nobody combines *existing implementations + demand + reusable building blocks* into one cited verdict.

## 2. Goals and non-goals

### Goals (v1)

1. **Answer two questions with evidence.** (a) Should I build this? (b) What existing repos should I use, fork, learn from or contribute to?
2. **Hard data, not opinion.** Stars, last commit, license, downloads and installs come from APIs. Every claim in the report links to a source.
3. **Honest verdicts.** The verdict is computed from the evidence by a script using fixed rules, not written freely by the model.
4. **Builder-native coverage.** GitHub, skills.sh, Claude plugin marketplaces, MCP registries, npm, PyPI, Hacker News and the open web.
5. **A curated catalog** of ~300 researched repos in ~35 categories, updated weekly, so recommendations are strong even when live search is weak.
6. **Fast and free.** Quick mode in about 2 minutes, standard in about 5. No paid API keys. No npm dependencies.
7. **Shareable.** A Markdown report plus a one-screen HTML verdict card that people want to post.
8. **Portable.** Works in Claude Code (primary), Codex and OpenCode through the open Agent Skills format.

### Non-goals (v1)

- Business plans, TAM/SAM/SOM, pitch decks, financial projections, personas.
- Reddit, X, Instagram, TikTok and LinkedIn as built-in sources. Access is closing, paid or against the platforms' terms (see §15). They are optional in v2, and only through tools the user already has connected.
- Generating or scaffolding the project.
- A hosted web service. This is a local skill.
- Telemetry of any kind.

## 3. Users

| User | Situation | What they want |
|---|---|---|
| **Vibe coder** (primary) | Has an idea, about to start a project with an agent | "Does this exist? What should I use? Is there a gap?" in minutes |
| **Indie hacker** | Choosing what to build next | Demand evidence, open gaps, competitors' weaknesses |
| **Developer starting a feature** | Wants to avoid reinventing a library | The best maintained building blocks, with license safety |
| **Open-source contributor** | Wants to help rather than fork | Projects that already do 80% and would welcome a PR |
| **Learner / hobbyist** | Building for fun or to practice, and doesn't care whether it exists | Good projects to learn from, and the right building blocks. No verdict (§4.1) |

## 4. User experience

### Invocation

```
/check "A skill that extracts a website's design into DESIGN.md"
/check --quick "..."      # ~2 min: catalog + GitHub + verdict
/check --deep "..."       # ~5–8 min: more queries, issue mining, deeper demand
/check --for fun "..."    # building for fun or to learn: no verdict, inspiration + building blocks
/check --for me "..."     # building a tool for yourself: gentle "this could save you time" hints
/check --for launch "..." # publishing for users: full verdict (the default when unclear)
```

The skill also triggers from natural language, for example *"check if this already exists: …"* or *"before I build X, what's out there?"*, through its description field.

### 4.1 Build purpose: the tool informs, it never forbids

Building something that already exists is fine, and it's how most people learn. The verdict answers **"Is there room for this out there?"**, never **"Are you allowed to build this?"** So the skill adapts to *why* the user is building:

| Purpose | Flag | Typical phrasing | What the report focuses on |
|---|---|---|---|
| 🎓 **Fun / learning** | `--for fun` | "just for fun", "to learn X", "side project to practice" | **No verdict.** Well-built projects to learn from (💡), building blocks (🧱), a light "how common is this" note. Demand research is skipped. |
| 🛠️ **For me** | `--for me` | "for myself", "for my own use", "for my team" | **Soft hint, no verdict.** "Existing tools that might save you time", then building blocks. Building your own is presented as a valid choice. |
| 🚀 **Launch** | `--for launch` | "launch", "publish", "get users", "go viral", "sell" | **The full verdict** (§9), with friendly labels (§9.7) and always a way forward. |

**How the purpose is set:**

1. An explicit `--for` flag always wins.
2. Otherwise the skill infers it from the idea text (Phase 1).
3. If it's unclear, it uses **launch**. Every launch-mode report and chat summary then ends with one line: *"Just building for fun, to learn or for yourself? Ignore the verdict, and the building blocks below are for you."*

The skill never asks the user about their purpose in order to continue. It infers, or uses the default.

### What the user sees

1. **Understanding the idea.** A short restatement plus search terms. If the idea is too vague to search, the skill asks one clarifying question; otherwise it continues without stopping.
2. **Live progress lines**, for example:
   `Searching GitHub (12 queries)… Found 34 candidates · Checking skills.sh · MCP registry · npm · Hacker News…`
3. **A chat summary** with the verdict, scores, top 3 competitors, top building blocks and the suggested next step.
4. **Files written:**
   - `check-reports/<date>-<slug>/report.md`, the full report
   - `check-reports/<date>-<slug>/evidence.json`, the raw evidence
   - `check-reports/<date>-<slug>/card.html`, the shareable verdict card

### Example chat summary

```
VERDICT: 🔀 BUILD WITH AN ANGLE   (confidence: high)
Saturation 9/10 · Demand 8/10 · Gap 5/10

Closest existing: designlang — 4.2k ⭐, updated 3 days ago, MIT
Also: dembrandt (3.6k ⭐), firecrawl-website-design-clone (33k installs)
Open gap: no tool verifies that the extracted design reproduces the original
Building blocks: 🧱 playwright · 🧱 @google/design.md · 🍴 dembrandt extractor (MIT)
Next step: contribute a "verify" mode to designlang, or build verify-first.
Full report → check-reports/2026-10-17-design-extractor/report.md
```

## 5. System overview

**Core principle: the agent reasons, scripts fetch facts.**

```
                ┌───────────────────────────────┐
  user idea ──▶ │  SKILL.md (method + rules)    │
                └──────────────┬────────────────┘
                               │ Phase 1: understand
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
  │ Supply agent │    │ Demand agent │    │ Building-blocks  │   (parallel sub-agents
  │  Phase 2     │    │  Phase 3     │    │ agent  Phase 5   │    in Claude Code;
  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘    sequential elsewhere)
         │  uses              │ uses                │ uses
         ▼                    ▼                     ▼
  ┌────────────────────────────────────────────────────────────┐
  │ scripts/*.mjs: GitHub · npm · PyPI · MCP registry ·         │
  │ skills.sh · plugin marketplaces · HN (Algolia) · catalog    │
  └────────────────────────────────────────────────────────────┘
         │                    │                     │
         └──────────┬─────────┴─────────────────────┘
                    ▼
          Phase 4: gaps  →  evidence.json
                    ▼
          Phase 6: score.mjs  →  scores + verdict (rule-based)
                    ▼
          Phase 7: verify.mjs  →  drop/correct anything unverifiable
                    ▼
          report.md · card.html · chat summary
```

### Three knowledge layers

| Layer | What | Role | Version |
|---|---|---|---|
| **1. Catalog** | ~300 curated repos in ~35 categories, updated weekly | Checked **first**. Trusted, fast, works offline-ish | v1 |
| **2. Live search** | GitHub, registries, npm, HN, web, run fresh on each check | Catches new projects and the long tail outside the catalog | v1 |
| **3. User stack** (`stack.md`) | The user's own preferred tools | Personal preference boost | v2 |

## 6. The research workflow (7 phases)

Each phase lists its **inputs**, **steps**, **outputs** and **rules**. Quick, standard and deep modes differ only in the budgets given in §6.8.

### 6.1 Phase 1 — Understand the idea

**Input:** the user's idea text (any language).

**Steps:**

1. Restate the idea in one sentence: *what it is, for whom, in what form*.
2. Extract:
   - **core concept**, e.g. "extract a website's design system into an agent-readable file"
   - **form factor**: one or more of `skill`, `plugin`, `mcp`, `cli`, `library`, `web-app`, `desktop-app`, `mobile-app`, `browser-extension`, `api`, `template`
   - **target user**
   - **purpose**: `fun`, `me` or `launch` (§4.1). Use the `--for` flag if given, otherwise infer it from the phrasing, otherwise default to `launch`. Record whether it was `explicit`, `inferred` or `default`.
   - **search terms**: 8–15 queries including synonyms and jargon, e.g. "design tokens from url", "DESIGN.md generator", "brand extractor", "style guide extractor"
   - **components**: 2–6 technical building blocks, e.g. "headless browser automation", "computed CSS extraction", "markdown generation"
   - **catalog categories**: map the idea and each component to catalog category slugs (§8.3)
3. **Vagueness check.** If no meaningful search terms can be derived (e.g. "an app"), ask **one** clarifying question and stop. Otherwise continue without asking.

**Output:** an `idea` object in `evidence.json` (§13.1).

**Rules:** do not judge the idea in this phase.

### 6.2 Phase 2 — Supply: does it already exist?

**Input:** search terms, form factor, categories.

**Steps:**

1. **Catalog lookup**: `catalog.mjs search --categories … --terms …`. Catalog entries that match the *whole idea*, not just one component, are competitor candidates.
2. **GitHub search**: `github.mjs search` for each search term. Collect name, description, stars, pushed_at, license, archived flag, topics and URL. Deduplicate.
3. **Registry searches**, chosen by form factor:
   - skill/plugin → `skills.mjs search` (skills.sh), `plugins.mjs search` (official marketplace)
   - mcp → `mcp.mjs search` (Smithery first, then the official registry as a presence check)
   - library/cli (JS) → `npm.mjs search`
   - library/cli (Python) → web search `site:pypi.org`, then `pypi.mjs info` for metadata
   - always → web search for commercial products (`"<concept>" tool`, `"<concept>" alternative`)
4. **Classify each candidate's match**:
   - `direct`: does essentially the same job for the same user
   - `partial`: overlaps substantially but differs in a key dimension (form, scope, audience)
   - `adjacent`: related; a building block or neighbour, not a competitor
   The model makes this judgment, and must give a **one-line reason** for each `direct` or `partial` label.
5. Keep at most the top 15 by relevance × popularity. Always keep every `direct` match.

**Output:** `competitors[]` in `evidence.json`.

**Rules:**

- Every competitor must come from a tool or script result in this run. **Never cite a repo from memory.** Memory can suggest search queries but cannot be evidence.
- Use one popularity signal per source: stars (GitHub), installs (skills.sh), weekly downloads (npm). Never mix them into one number.

### 6.3 Phase 3 — Demand: does anyone want it?

**Input:** idea, search terms, top competitors.

**Steps:**

1. **Hacker News** (`hn.mjs`): search stories and comments for the concept and synonyms. Collect Show HN / Ask HN posts with points, comment counts and dates.
2. **GitHub issues on competitors** (`github.mjs issues`): for the top 3–5 `direct`/`partial` competitors, fetch open issues sorted by 👍 reactions. These count as **unmet-demand evidence** (feature requests, complaints).
3. **Web search**: "how do I …" questions, forum threads, blog posts asking for this capability.
4. **Competitor popularity as a demand signal.** Strong adoption of competitors (stars, installs) is itself evidence that people want this kind of tool.
5. **Optional connected sources (v2).** If the agent environment exposes Reddit, X or YouTube tools, use them. Never required.

**Output:** `demand[]` items, each with type, quote (≤ 25 words), url, date and engagement.

**Rules:** quotes must be verbatim and short. Each item needs a URL.

### 6.4 Phase 4 — Gaps: what's missing?

**Input:** competitors, demand, competitor issues.

**Steps:**

1. Collect **weaknesses** of each top competitor from its README limitations, open issues and complaints.
2. Find **unmet requests**: demand items that no direct competitor satisfies.
3. Flag **stale competitors**: no push in > 12 months, or archived.
4. Formulate 1–4 **gap statements**. Each must cite at least one piece of evidence, and must state which top competitors lack it and how that was checked (README, docs, issues).

**Output:** `gaps[]`.

**Rules:** a gap without evidence is not allowed. "Better UX" alone is not a gap unless users complain about the UX.

### 6.5 Phase 5 — Building blocks: what can I build it with?

**Input:** components, categories.

**Steps:**

1. **Catalog first**: for each component, `catalog.mjs search` by category and tags.
2. **Live search** for components the catalog doesn't cover well: GitHub plus npm (or PyPI).
3. **Fetch live stats** for every candidate (stars, pushed_at, license, archived, downloads).
4. **Rank** by fit, then maintenance (recent push), adoption (stars/downloads), and license.
5. **Assign one recommendation type** per block:
   - 🧱 **use**: add as a dependency (maintained library/framework)
   - 🍴 **fork**: copy or fork code. **Only allowed with a permissive license.**
   - 💡 **learn**: study how it solves a sub-problem. Any license; no copying implied.
   - 🤝 **contribute**: a project already covers ≥ 80% of the idea and is active; a PR may beat a new project
6. **License classification** (§6.5.1).

**Output:** `building_blocks[]`, 2–4 per component, at most 12 total.

#### 6.5.1 License classes

| Class | SPDX examples | Allowed recommendation types |
|---|---|---|
| `permissive` ✅ | MIT, Apache-2.0, BSD-2/3-Clause, ISC, MPL-2.0 (file-level) | use, fork, learn, contribute |
| `copyleft` ⚠️ | GPL-2.0/3.0, AGPL-3.0, LGPL | use (with explanation), learn, contribute. Fork only with an explicit warning |
| `none` ❌ | no license file | learn only. The report says *"no license: you have no right to copy this code"* |
| `other` ❓ | custom / non-OSI | learn only, plus "check the license" |

### 6.6 Phase 6 — Score and verdict

The agent writes all collected evidence to `evidence.json` and runs `score.mjs`. **The script computes scores and the verdict using the rules in §9.** The model may not override the verdict. It can only add context in the report under "What would change the verdict".

The purpose (§4.1) controls how the result is presented, not the underlying computation:

- **launch**: verdict shown with friendly labels (§9.7)
- **me**: scores are computed but no verdict is shown; saturation is translated into the "might save you time" hint
- **fun**: scores and verdict are not shown at all; `score.mjs` still records saturation, for the "how common is this" note

### 6.7 Phase 7 — Fact-check and write

1. Run `verify.mjs evidence.json` (§10). It re-fetches every repo, package and URL, corrects numbers and marks dead items.
2. Re-run `score.mjs` if verification changed any data.
3. Write `report.md` from `references/report-template.md`, using **only verified items**.
4. Generate `card.html` with `card.mjs`.
5. Print the chat summary (§4).

### 6.8 Mode budgets

| | quick | standard | deep |
|---|---|---|---|
| Search terms used | 4 | 8 | 15 |
| GitHub results per query | 10 | 20 | 30 |
| Registries | catalog + GitHub only | all applicable | all applicable |
| Demand | competitor popularity only | HN + web | HN + web + issue mining of top 5 |
| Competitor issue mining | — | top 3 | top 5 |
| Building blocks | catalog only | catalog + live | catalog + live, more candidates |
| Sub-agents (Claude Code) | none | 3 parallel | 3 parallel |
| Target time | ~2 min | ~5 min | ~8 min |

**Purpose adjustments** (applied on top of the mode budget):

| | fun | me | launch |
|---|---|---|---|
| Phase 3, demand | skipped | skipped | full |
| Phase 4, gaps | skipped | short ("what existing tools lack, if you want it your way") | full |
| Phase 5, building blocks | **emphasized**: more 💡 learn examples | full | full |
| Verdict shown | no | no (soft hint) | yes |
| Verdict card | "My next build" card: idea, building blocks, inspiration | none by default | full verdict card |

## 7. Sources

All v1 sources are **free and need no API key**. Every source below was **verified with real requests on 2026-10-17**. Details, examples and quirks are in [sources-findings.md](sources-findings.md).

| Source | Purpose | Access method | Popularity signal | Notes |
|---|---|---|---|---|
| **GitHub repos** | Competitors, building blocks | REST `GET https://api.github.com/search/repositories?q=` (token from `gh auth token` when available) | stars | 10 searches/min unauthenticated · 30/min authenticated |
| **GitHub repo details** | Live stats, license, archived | `GET /repos/{owner}/{repo}` | stars | 60/h unauthenticated · 5,000/h authenticated; 404 = missing |
| **GitHub issues** | Unmet demand, weaknesses | `GET /search/issues?q=repo:{o}/{r}+is:issue+is:open&sort=reactions-+1` | 👍 | Shares the search limit |
| **skills.sh** | Existing agent skills | `GET https://skills.sh/api/search?q=` (undocumented) | installs | Semantic search for multi-word queries; ≤ 100 results; no descriptions |
| **Official Claude plugin marketplace** | Existing plugins | Download `anthropics/claude-plugins-official/.claude-plugin/marketplace.json` once, match locally | — | ~315 plugins with name, description, category |
| **Community plugins** | Existing plugins | Covered by GitHub repo search + skills.sh | stars / installs | ~42k marketplace files exist; too many to index |
| **Smithery** | Existing MCP servers (primary) | `GET https://registry.smithery.ai/servers?q=&pageSize=` | useCount | No key needed; description-aware search |
| **Official MCP registry** | Existing MCP servers (presence check) | `GET https://registry.modelcontextprotocol.io/v0.1/servers?search=&version=latest` | — | Matches **server names only**, single keywords |
| **npm** | JS packages | `GET https://registry.npmjs.org/-/v1/search?text=&size=` (includes downloads) | weekly downloads | Ranking is popularity-weighted; the agent must judge relevance |
| **PyPI** | Python packages | Discovery via web search `site:pypi.org`; metadata via `GET https://pypi.org/pypi/<pkg>/json` | — | No search API |
| **Hacker News** | Demand, launches | `GET https://hn.algolia.com/api/v1/search?query=&tags=story` (+ `search_by_date`, `show_hn`, `ask_hn`) | points | No key |
| **Web** | Commercial products, demand, mcp.so | The agent's built-in web search / fetch tools | — | Varies by agent |
| **Catalog** | Curated repos | Local files, `catalog.mjs` | live GitHub stats | Offline-capable |

**Deferred:** Glama (requires an API key and per-page attribution).

### 7.1 Query-writing rules (from M0 findings)

The quality of results depends heavily on how queries are written. The skill instructs the agent to:

1. **Use 2–4 core keywords, unquoted.** Natural-language phrases ("design tokens from url") return junk or nothing, and quoted phrases are exact matches.
2. **Search by function, not by guessed product name.** For example, "designlang" lives at `Manavarya09/design-extract`.
3. **Run several varied queries** per idea (synonyms, jargon, the problem as well as the solution).
4. **Add `stars:>20`** to GitHub searches by default, to drop spam and keyword-stuffed repos.
5. **Add 1–2 `topic:<slug>` queries** for the idea's category.
6. **Never use `in:readme`.** It's far too broad.
7. **Official MCP registry:** single-word name queries only. Use Smithery for descriptive searches.
8. **Don't trust registry ordering.** npm and skills.sh rank by popularity, so the agent judges relevance.

**Not built in (v1):** Reddit (public API closing in 2026), X (paid API), Instagram/TikTok/LinkedIn (no realistic legal access). See §15.

## 8. The catalog

The catalog is the core asset: a curated, categorized list of repos that are proven good choices for builders.

### 8.1 What's stored vs. fetched live

| Stored in catalog (rarely changes) | Fetched live on every check |
|---|---|
| repo id, name, category, subcategories, tags | stars |
| kinds (library, framework, template, skill, mcp, cli, app, service) | last push date |
| ecosystems (js, ts, python, go, rust, any) | license (re-checked) |
| `use_for`: one line on what it's for | archived flag |
| `why`: one line on why it's recommended | npm weekly downloads (if applicable) |
| `alternatives`: related catalog ids | |
| `added`, `last_reviewed` dates | |

A `catalog/.cache/stats.json` snapshot (refreshed by the weekly health check) is used as a fallback when live fetching fails. When it is used, the report labels its numbers *"as of <date>"*.

### 8.2 Quality rules (decided 2026-10-17)

The **same rules apply to every entry**, including the maintainer's own favourites. They are implemented once in `scripts/lib/criteria.mjs` and used by `catalog-add`, `catalog-validate`, `health` and `scout`. They are re-checked live, so an entry that stops qualifying stops being recommended.

**Tiers:**

| Tier | Requirement | Shown as |
|---|---|---|
| ⭐ **Top choice** | ≥ 3,000 stars (or the alternative top signal below) **and** pushed ≤ 90 days ago | "Top choice" |
| ✅ **Solid** | ≥ 1,000 stars (or an alternative signal) **and** pushed ≤ 6 months ago | "Solid" |
| ❌ Excluded | anything else | — |

**Alternative adoption signals** (any one replaces the star requirement):

| Signal | Solid | Top choice |
|---|---|---|
| skills.sh installs | ≥ 5,000 | ≥ 50,000 |
| npm weekly downloads | ≥ 50,000 | ≥ 500,000 |
| Smithery uses | ≥ 1,000 | ≥ 10,000 |
| Official vendor repo (`official: true`, e.g. Stripe's or Supabase's own) | ✔ | ✔ if pushed ≤ 90 days |

**Freshness** (last push):

| Last push | Label |
|---|---|
| ≤ 30 days | 🟢 very fresh |
| ≤ 90 days | 🟢 fresh |
| ≤ 6 months | 🟡 OK (noted in reports) |
| > 6 months | ❌ excluded |

**Exception, finished libraries:** an entry marked `stable: true`, with ≥ 5,000 stars and a written `stable_reason`, may go up to **18 months** without a push. It is always tier ✅, never ⭐.

**Hard requirements (all entries):**

1. **Not archived.**
2. **Licensed**: permissive or copyleft license class. No license, or a custom license, is excluded. When GitHub reports `NOASSERTION` (a license file it can't classify, common for MIT with a custom header), the license is resolved from the npm package that points back to the same repo. If that fails, the entry is flagged *"verify by hand"* instead of being rejected. When GitHub detects **no** license (common for repos with per-folder licenses or a license stated only in the README, e.g. `anthropics/skills`, `vercel-labs/agent-skills`), the entry fails until a human reads the license and records it in `license_verified: { license, note, date }`. The `note` records exceptions (e.g. *"docx/pdf/pptx/xlsx skills are source-available"*), and the skill never recommends forking excepted parts.
3. **≥ 3 contributors**: no single point of failure.
4. **No signs of fake stars**: excluded when stars ≥ 1,000 but forks are under 1 % of stars **and** there are 2 or fewer contributors.
5. **Clear use case**: `use_for` fits in one plain sentence.
6. **Not a thin fork or clone** of another entry.
7. **Documented**: a README that explains installation and usage.

**Size:** depth over a fixed number (decided 2026-10-17). At least 5 and **at most 20 per category** (up to ~1,000 entries). The bar is never lowered to fill a category. Up to **5 entries per category are `featured`**: the strongest picks, shown first in recommendations, so users get a short list even when a category is deep. The cap keeps weekly health checks within GitHub's API budget and stops the catalog from diluting.

### 8.3 Removal criteria

- Archived or deleted.
- License removed or changed to a non-qualifying class.
- Falls outside the freshness rules (> 6 months, or > 18 months for `stable`).
- Contributors drop below 3, or fake-star signals appear.
- A security incident or compromise.
- Superseded: a clearly better maintained alternative exists and the project itself recommends it.

`health.mjs` flags these weekly. Removals are recorded in `CHANGELOG.md`.

### 8.4 Domains and categories

Two levels, defined in `catalog/categories.json`:

- **20 domains**, meaning what people build, in their own words. Each domain maps to the building-block categories it typically needs, so the skill can say *"you're building a game: here are engines, physics, audio and multiplayer"*.
- **50 building-block categories** in 12 groups. Entries live here only, so one repo appears once even when several domains use it. Each category carries GitHub search queries for `scout.mjs`.

**Domains:** websites · e-commerce · mobile apps · desktop apps · games · AI apps and agents · tools for coding agents · CLI tools · extensions for apps (browser, VS Code, Obsidian, Raycast, Figma) · bots · APIs and backends · automation and scraping · data, analytics and ML · video and media · music and audio · content and docs · 3D/VR/AR · creative coding · CAD and 3D printing · hardware, IoT and smart home.

**Category groups:**

| Group | Categories |
|---|---|
| Frontend | web-frameworks · ui-components · styling · animation · 3d-graphics · forms-validation · state-data · charts-dataviz |
| Backend and data | backend · databases · realtime · auth · payments · ecommerce · email · storage-uploads · search |
| AI | ai-sdks · agents · rag-vector · mcp-servers · agent-skills |
| Games | game-engines · game-libraries · multiplayer |
| Platforms | mobile · desktop · app-extensions · bots · cli-tooling |
| Automation | browser-automation · workflow-automation |
| Media | video-media · music-audio · images · maps-geo |
| Making | creative-coding · cad-3d-printing · embedded-iot |
| Data | data-science-ml |
| Quality and ops | testing · deploy-infra · observability · analytics · security · dev-tooling · i18n |
| Content | cms-content · docs-sites |
| Starters | starters (tagged by domain) |

**Deliberately excluded in v1:** crypto/Web3/smart contracts (mistakes cost real money; recommendations would give false confidence), robotics/ROS (too niche, hardware-heavy), education apps and office automation (covered by other domains).

### 8.5 Weekly update workflow (maintainer)

Target: **30–60 minutes per week.**

```
1. node scripts/scout.mjs          → scout-report.md (new candidates)
2. node scripts/health.mjs         → health-report.md (dead/archived/license changes)
3. Review both reports; approve or reject each item
4. node scripts/catalog-add.mjs <owner/repo> --category <slug>   (drafts an entry)
   Edit use_for / why if needed
5. node scripts/catalog-validate.mjs   → schema + duplicate + criteria checks
6. Add the week's entry to CHANGELOG.md
7. Commit: "catalog: week 47 — +12 / −3"
```

**`scout.mjs` candidate sources:**

- GitHub search per category: repos created or pushed in the last 30 days, with a star threshold per category
- skills.sh top/trending *(verify access)*
- New entries in the official MCP registry *(verify)*
- Diffs of selected awesome lists since the last scout run
- Candidates that recent `/check` runs found repeatedly but which aren't in the catalog (from local reports, opt-in)

**`health.mjs` checks** every catalog entry for: archived, missing (404), license change, inactivity beyond thresholds, and big star drops. It also refreshes `catalog/.cache/stats.json`.

### 8.6 Community contributions

- An issue template, *"Suggest a repo"*, with fields matching the schema.
- A PR template with a checklist of the inclusion criteria.
- `catalog-validate.mjs` runs in CI on every PR.

## 9. Scoring and verdict

All scores are 0–10. **Saturation** and **Demand** are computed by formula. **Gap** is scored by the model against a fixed rubric, and the model must cite evidence. The **verdict** is computed by rules. The initial weights below are tuned against the evaluation set (§18).

### 9.1 Saturation (formula)

For each competitor *c*:

- **match weight** `m`: direct = 1.0 · partial = 0.5 · adjacent = 0.1
- **activity** `a`: pushed ≤ 90 days = 1.0 · ≤ 365 days = 0.6 · older = 0.2 · archived = 0
- **popularity** `p` (0–1): each available signal is normalised on its own scale, and the strongest wins across the project's sources (`signals` and `other_signals`). Raw numbers are never mixed.
  - GitHub stars: `min(1, log10(stars + 1) / 4)` (10k stars → 1.0)
  - skills.sh installs: `min(1, log10(installs + 1) / 4.5)`
  - npm weekly downloads: `min(1, log10(downloads + 1) / 5)`
  - Smithery useCount: `min(1, log10(uses + 1) / 4)`
  - commercial product with evidence of traction: 0.7; without: 0.4

```
coverage   = Σ (m × a × p)
saturation = round(10 × (1 − e^(−coverage)), 1)
```

Sanity examples: one tiny direct repo (50 ⭐, active) → ~3.5. Two strong active direct competitors (4k ⭐ each) → ~8.4.

### 9.2 Demand (formula)

Each demand item gets a weight:

| Evidence | Weight |
|---|---|
| Explicit request or complaint (forum, web, issue) | 1.0 |
| GitHub issue on a competitor with ≥ 10 👍 | 1.5 |
| HN story ≥ 50 points about this need or a competitor | 1.5 |
| HN story < 50 points | 0.3 |
| Strong competitor adoption (direct competitor with p ≥ 0.8) | 2.0 each, max 2 counted |

```
D      = Σ weights
demand = round(10 × (1 − e^(−D / 4)), 1)
```

### 9.3 Gap (rubric, model-scored, evidence required)

| Score | Meaning |
|---|---|
| 0–2 | No gap found; top competitors cover the idea well |
| 3–4 | Minor gaps (polish, small missing features) with weak evidence |
| 5–6 | One clear, evidenced gap that top competitors lack |
| 7–8 | Several evidenced gaps, or top competitors are stale |
| 9–10 | No real competitor, or all are stale/archived, while demand exists |

The score must be justified by the gap statements in `gaps[]`. `score.mjs` caps the gap at 3 if `gaps[]` is empty.

### 9.4 Verdict rules (applied in order; first match wins)

| # | Condition | Verdict |
|---|---|---|
| 1 | demand < 3 | ❌ **DROP**: no evidence anyone wants this |
| 2 | saturation ≥ 7 and gap < 3 | ❌ **DROP**: well covered, no open angle |
| 3 | a single direct competitor is active (≤ 90 d), permissive license, and the model rated its coverage ≥ 80 % | 🤝 **CONTRIBUTE**: improve that project instead |
| 4 | the best direct competitor is inactive > 12 months, permissive license, good fit | 🍴 **FORK**: revive or fork it |
| 5 | saturation < 4 and demand ≥ 4 | ✅ **BUILD**: open space with demand |
| 6 | gap ≥ 5 | 🔀 **BUILD WITH AN ANGLE**: lead with the gap |
| 7 | otherwise | ❔ **UNCLEAR**: evidence is mixed; the report lists what to research next |

### 9.5 Confidence

| Level | Condition |
|---|---|
| high | All applicable sources answered; ≥ 10 candidates evaluated; verification passed for ≥ 90 % of items |
| medium | One applicable source failed, or 5–9 candidates |
| low | Two or more sources failed, < 5 candidates, or a rate-limit cut the search short |

Low confidence is shown prominently. **Absence of evidence is not evidence of absence**, and the report says so when results are thin.

### 9.6 "What would change the verdict"

The model writes 1–3 concrete conditions, for example *"If designlang adds a verify mode, saturation of the angle rises and the verdict becomes DROP."*

### 9.7 Friendly labels and purpose-based display

The internal verdict codes stay strict, so scoring and evals are unchanged. What users see is friendlier, and every verdict comes with a way forward:

| Internal code | Shown to the user (launch) | Always followed by |
|---|---|---|
| `BUILD` | ✅ **Open space: go build it** | The suggested plan |
| `BUILD_WITH_ANGLE` | 🔀 **Build it with an angle** | The gap to lead with |
| `CONTRIBUTE` | 🤝 **You could join an existing project** | Which project, and what you could add. Plus: "If you'd rather build your own, here's how to differ." |
| `FORK` | 🍴 **Revive an abandoned project** | The project and its license. Plus: "Or start fresh using these building blocks." |
| `DROP` | 📚 **Already well covered** | "If you build it anyway, here's how to stand out" (the strongest differentiator found), plus building blocks |
| `UNCLEAR` | ❔ **Mixed signals** | What to research next |

Display by purpose:

| Purpose | Headline shown |
|---|---|
| fun | 🎓 **"Building for fun: great! Here's what helps."** No verdict. |
| me | 🛠️ **"Building for yourself."** If saturation ≥ 7: "These existing tools might save you time: …". Otherwise: "Not much exists, so building your own makes sense." No verdict. |
| launch | The friendly label from the table above, plus the scores |

Wording rules for every purpose: never say "don't build this" or "you shouldn't". Describe the landscape and let the user decide.

## 10. Fact-checking

`verify.mjs` runs over `evidence.json` before the report is written:

1. **GitHub repos**: `GET /repos/{owner}/{repo}`. On 404, mark `verified: false` and drop the item. On redirect, update the id. Refresh stars, pushed_at, license and archived.
2. **npm packages**: re-fetch metadata and downloads. Drop missing packages.
3. **URLs** (demand items, commercial products): HTTP HEAD/GET and check for status < 400. Mark dead links. Dead demand items are dropped; dead product sites are kept but labelled.
4. **Numeric drift**: if a number the agent wrote differs from the live value by > 10 %, replace it with the live value and log the correction.
5. Writes `verification` stats into `evidence.json`: checked, passed, corrected, dropped.

**Hard rule in SKILL.md:** the report may only cite items with `verified: true`.

## 11. Output: report, evidence file, verdict card

### 11.1 Report (`report.md`) sections

1. **Header**: idea, date, mode, confidence
2. **Verdict box**: verdict, three scores, one-sentence reason
3. **Closest existing projects**: table: name/link · type · ⭐/installs/downloads · last update · license · match · one-line note
4. **Demand evidence**: bullets with short quotes and links, grouped by source
5. **Gaps**: each gap with its evidence
6. **Building blocks**: grouped 🧱 use · 🍴 fork · 💡 learn · 🤝 contribute, each with stats, license class and why
7. **Suggested plan**: 3–5 concrete steps that follow from the verdict
8. **What would change the verdict**
9. **Method and coverage**: sources queried, what failed, number of candidates, verification stats
10. **Sources**: every link used

#### Report variants by purpose

| Section | fun | me | launch |
|---|---|---|---|
| 1. Header | ✅ | ✅ | ✅ |
| 2. Verdict box | replaced by the 🎓 headline | replaced by the 🛠️ headline + hint | ✅ friendly label + scores |
| 3. Closest existing projects | renamed **"Projects to learn from"**, sorted by code quality and docs | renamed **"Existing tools that might save you time"** | ✅ |
| 4. Demand evidence | — | — | ✅ |
| 5. Gaps | — | short | ✅ |
| 6. Building blocks | ✅ emphasized | ✅ | ✅ |
| 7. Suggested plan | learning path (3–5 steps) | build plan | plan that follows from the verdict |
| 8. What would change the verdict | — | — | ✅ |
| 9. Method and coverage | ✅ | ✅ | ✅ |
| 10. Sources | ✅ | ✅ | ✅ |

Example, fun mode:

```
🎓 Building for fun: great! Here's what helps.

Projects to learn from:
  💡 tastejs/todomvc — the same app in 40+ frameworks
  💡 ...
Building blocks:
  🧱 React · 🧱 Tailwind · 🧱 Zustand
How common is this: very. Thousands of todo apps exist on GitHub. It's a classic learning project.
```

### 11.2 Evidence file (`evidence.json`)

Machine-readable record of everything (§13.1). It is used for scoring, verification, re-runs and evals.

### 11.3 Verdict card (`card.html`)

- Single self-contained HTML file, **1200 × 630**, so a screenshot fits the X/LinkedIn link preview size
- Shows: the idea (shortened), a big verdict badge, three score bars, *"Closest existing: X (4.2k ⭐)"*, one gap line, and a small footer *"checked with check-before-you-build"*
- Light and dark variants; no external requests
- v2: PNG export

## 12. Architecture and file layout

```
check-before-you-build/
├── README.md
├── LICENSE                              MIT
├── CHANGELOG.md                         weekly catalog updates + releases
├── CONTRIBUTING.md                      how to suggest repos / contribute
├── docs/
│   ├── SPEC.md                          this document
│   └── IMPLEMENTATION_PLAN.md
├── skills/
│   └── check-before-you-build/
│       ├── SKILL.md                     entry point: trigger, workflow summary, hard rules
│       ├── references/
│       │   ├── methodology.md           the 7 phases in full detail
│       │   ├── sources.md               how to query each source + fallbacks
│       │   ├── scoring.md               formulas, rubric, verdict rules
│       │   ├── report-template.md       report structure
│       │   └── subagents.md             briefs for the 3 parallel research agents
│       ├── scripts/
│       │   ├── lib/                     shared: http (retry/backoff), cache, gh, cli, license
│       │   ├── github.mjs               search · repo · issues
│       │   ├── npm.mjs                  search · info · downloads
│       │   ├── pypi.mjs                 info
│       │   ├── mcp.mjs                  Smithery + official MCP registry search
│       │   ├── skills.mjs               skills.sh search
│       │   ├── plugins.mjs              official plugin marketplace search
│       │   ├── hn.mjs                   Hacker News search
│       │   ├── catalog.mjs              catalog search · get · categories
│       │   ├── score.mjs                scores + verdict from evidence.json
│       │   ├── verify.mjs               fact-check evidence.json (M5)
│       │   └── card.mjs                 render card.html (M5)
│       └── catalog/                     inside the skill so installed copies include it
│           ├── schema.json              JSON Schema for entries
│           ├── categories.json          category slugs, names, descriptions
│           ├── entries/<category>.json  one file per category
│           └── .cache/stats.json        weekly stats snapshot (fallback)
├── scripts/                             maintainer tools (not part of the installed skill)
│   ├── scout.mjs
│   ├── health.mjs
│   ├── catalog-add.mjs
│   └── catalog-validate.mjs
├── evals/
│   ├── cases.json                       ideas + expected competitors/verdicts
│   └── check-eval.mjs                   compares an evidence.json to expectations
├── tests/                               node --test unit tests with recorded fixtures
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
└── .github/
    ├── ISSUE_TEMPLATE/suggest-repo.yml
    ├── PULL_REQUEST_TEMPLATE.md
    └── workflows/ci.yml                 tests + catalog validation
```

### 12.1 Script conventions

- **Node ≥ 20**, ES modules (`.mjs`), **no npm dependencies** (built-in `fetch`, `node:fs`, `node:test`).
- Every script prints **JSON to stdout**, logs to stderr, and exits non-zero on failure.
- A shared `lib/http.mjs` handles retries with exponential backoff, rate-limit headers and a polite User-Agent.
- A shared `lib/cache.mjs` caches responses for the duration of one check (in `check-reports/.cache/`) to avoid duplicate calls.
- **GitHub auth:** if `gh auth token` succeeds, that token is used for higher limits. The token is never stored or printed.
- Read-only: scripts only make GET/HEAD requests.

### 12.2 SKILL.md structure

- Frontmatter: `name`, and a `description` that states clearly when to trigger.
- **Hard rules** (always loaded): never cite from memory; only cite verified items; the verdict comes from `score.mjs`; stay within the mode budget; answer in the user's language.
- Workflow summary with links into `references/` (progressive disclosure keeps context small).
- How to run each script, and what to do when one fails.

## 13. Data formats

### 13.1 `evidence.json` (abridged)

```json
{
  "version": 1,
  "created": "2026-10-17T13:00:00Z",
  "mode": "standard",
  "language": "en",
  "idea": {
    "text": "A skill that extracts a website's design into DESIGN.md",
    "summary": "...",
    "form_factors": ["skill", "cli"],
    "target_user": "vibe coders using coding agents",
    "purpose": "launch",
    "purpose_source": "default",
    "search_terms": ["design tokens from url", "DESIGN.md generator", "..."],
    "components": ["headless browser automation", "computed CSS extraction"],
    "categories": ["agent-skills", "browser-automation"]
  },
  "competitors": [
    {
      "id": "github:Manavarya09/design-extract",
      "name": "designlang",
      "url": "https://github.com/Manavarya09/design-extract",
      "source": "github",
      "signals": { "stars": 4242, "pushed_at": "2026-10-08", "license": "MIT", "archived": false },
      "match": "direct",
      "match_reason": "URL → DESIGN.md + tokens for agents",
      "coverage_pct": 85,
      "notes": "feature-heavy; motion behind flags",
      "verified": true
    }
  ],
  "demand": [
    { "type": "hn_story", "title": "...", "url": "...", "points": 120, "date": "2026-05-02", "quote": "...", "verified": true }
  ],
  "gaps": [
    { "statement": "No tool verifies the extracted design reproduces the original", "evidence": ["https://..."], "checked": ["designlang README", "dembrandt README"] }
  ],
  "gap_score": 5,
  "building_blocks": [
    { "id": "github:microsoft/playwright", "component": "headless browser automation", "type": "use", "license_class": "permissive", "signals": { "stars": 70000 }, "from_catalog": true, "why": "...", "verified": true }
  ],
  "sources_status": { "github": "ok", "skills": "ok", "mcp": "ok", "npm": "ok", "hn": "ok", "web": "ok" },
  "scores": { "saturation": 9.2, "demand": 8.1, "gap": 5 },
  "verdict": { "code": "BUILD_WITH_ANGLE", "rule": 6, "confidence": "high" },
  "verification": { "checked": 31, "passed": 29, "corrected": 3, "dropped": 2 }
}
```

### 13.2 Catalog entry

```json
{
  "id": "heygen-com/hyperframes",
  "name": "HyperFrames",
  "category": "video-media",
  "subcategories": ["programmatic-video"],
  "tags": ["video", "animation", "mp4", "html", "agent-skill"],
  "kinds": ["library", "skill", "cli"],
  "ecosystems": ["ts"],
  "use_for": "Render MP4 videos from HTML/CSS animations, built for coding agents.",
  "why": "Agent-native, deterministic rendering, large block registry, actively maintained.",
  "alternatives": ["remotion-dev/remotion"],
  "stable": false,
  "added": "2026-10-17",
  "last_reviewed": "2026-10-17"
}
```

## 14. Error handling and degradation

| Failure | Behaviour |
|---|---|
| `gh` missing or unauthenticated | Fall back to the unauthenticated REST API with lower limits; the report suggests `gh auth login` |
| GitHub rate limit hit | Back off and retry once; then continue with the results so far and lower the confidence |
| A registry is unreachable or the format changed | Mark the source `failed` in `sources_status`; continue; the report lists it under "Method and coverage" |
| Live stats fail for catalog items | Use `catalog/.cache/stats.json`, labelled "as of <date>" |
| No web search tool in the agent | Skip web-based steps; confidence drops at most to medium if the other sources work |
| Zero candidates found | Don't conclude "doesn't exist"; report low confidence and suggest alternative search terms |
| `score.mjs` or `verify.mjs` crashes | Stop and report the error. **Never** invent a verdict manually |

## 15. Safety, privacy and terms of service

- **Read-only.** Scripts never post, star, fork or modify anything.
- **No secrets stored.** It uses the existing `gh` login only, and never prints or saves tokens.
- **No telemetry.** Nothing leaves the machine except the search requests themselves.
- **No scraping of login-walled platforms.** No cookies, no browser-session automation against Reddit, X, Instagram, TikTok or LinkedIn.
- **Polite access.** Clear User-Agent, caching, backoff, low request volume.
- **Idea privacy.** The idea text is sent to search engines as queries. The README states this. A `--private` flag (v2) can restrict to catalog + GitHub only.
- **Legal framing of recommendations.** Fork recommendations are made only for permissive licenses. Brand assets and trademarks are never recommended for copying.

## 16. Language

- The skill, catalog, report template and README are in **English**.
- Reports and chat summaries are written in the **user's language**, detected from the idea text, or set with `--lang`.
- Search queries are run in English plus, when relevant, the user's language.
- Catalog `use_for`/`why` lines stay in English; the model may translate them in the report.

## 17. Portability and installation

| Agent | Install (planned) |
|---|---|
| Any agent supported by the skills CLI | `npx skills add Smartulf123/check-before-you-build` |
| Claude Code (plugin) | `/plugin marketplace add Smartulf123/check-before-you-build` then `/plugin install check-before-you-build@check-before-you-build` |
| Codex / OpenCode | via the skills CLI (`--agent codex`, `--agent opencode`) |
| Manual | copy `skills/check-before-you-build/` into the agent's skills folder |

Requirements: Node ≥ 20. Recommended: `gh` CLI authenticated, for higher GitHub limits.

**Sub-agents:** in Claude Code, the supply, demand and building-blocks phases run as three parallel sub-agents using the briefs in `references/subagents.md`. Agents without sub-agents run the phases sequentially, with the same outputs.

## 18. Evaluation

### 18.1 Evaluation set (`evals/cases.json`)

Built from manual research done on 2026-10-15/17, plus control cases:

| # | Idea | Must find | Expected verdict family |
|---|---|---|---|
| 1 | Skill that extracts a website's design into DESIGN.md | designlang, dembrandt | BUILD WITH AN ANGLE / DROP |
| 2 | "Spotify Wrapped" for AI coding agents | tokscale, cc-wrapped | DROP / BUILD WITH AN ANGLE |
| 3 | Social-media deep-research skill (Reddit, X, YouTube…) | last30days-skill, Agent-Reach | DROP / BUILD WITH AN ANGLE |
| 4 | check-before-you-build itself | idea-reality-mcp, startup-skill | BUILD WITH AN ANGLE |
| 5 | *Control (obvious DROP):* a todo-list web app | multiple mature projects | DROP |
| 6 | *Control (open space):* to be chosen in Milestone 6 — a niche with demand and no direct competitor | — | BUILD |
| 7 | *Purpose (fun):* "I want to build a todo app just for fun to learn React" | todomvc-style learning projects | No verdict shown; 🎓 headline; learning path |
| 8 | *Purpose (me):* "A small tool for myself to organize my recipes" | existing recipe managers | No verdict shown; 🛠️ hint lists existing tools |

Cases 7–8 also check the wording rule (§9.7): the report never contains "don't build" or "you shouldn't".

### 18.2 Metrics

- **Recall of must-find competitors**: target 100% on cases 1–4.
- **Verdict family match**: target 5/6 on cases 1–6.
- **Purpose handling**: cases 7–8 show the correct variant and pass the wording rule (2/2).
- **Hallucination rate**: cited items that fail verification. Target 0 in the final report.
- **Runtime**: within the mode targets in §6.8.

`check-eval.mjs` scores an `evidence.json` against its case automatically. Runs are repeated after any change to methodology, scoring or scripts.

## 19. Version 1 vs version 2

### v1 — launch target ~2026-11-20

- All 7 phases; quick / standard / deep modes
- Build purposes: fun / me / launch (flag or inferred; default launch) with friendly verdict labels
- Sources: catalog, GitHub (repos + issues), skills.sh, plugin marketplaces, MCP registry, npm, PyPI (info), HN, web
- Catalog: ~300 entries, ~35 categories, schema, validation
- Maintainer tools: `scout.mjs`, `health.mjs`, `catalog-add.mjs`, `catalog-validate.mjs`
- Building blocks with the four recommendation types and license classes
- Rule-based scoring and verdict; confidence levels
- Fact-checking
- `report.md`, `evidence.json`, `card.html`
- Language follows the user; English default
- Install via the skills CLI and as a Claude Code plugin
- Evaluation set passing the targets in §18.2
- CI: unit tests + catalog validation

### v2 — after launch

- `stack.md` user preferences (with an offer to generate it from a local library folder)
- Catalog growth to 500+ through weekly updates and community PRs
- GitHub Action running `health.mjs` weekly and opening an issue with findings
- Optional connected sources: Reddit, X, YouTube via the user's own MCP tools; YouTube transcripts
- Deeper building-block advice down to specific files/modules
- "Good first issue" finder for 🤝 contribute recommendations
- PNG card export
- `--private` mode
- Re-check: diff a new run against a previous report ("what changed?")
- Polished packaging for Codex and OpenCode marketplaces

## 20. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Hallucinated or wrong repos in reports | Public embarrassment, lost trust | Never-from-memory rule; `verify.mjs`; only verified items cited |
| Wrong "doesn't exist" verdict | Users build duplicates | Confidence levels; "absence of evidence" wording; multiple sources; catalog |
| GitHub rate limits | Thin results | Use `gh` auth; caching; budgets; graceful degradation |
| skills.sh / registries change format (skills.sh's `/api/search` is undocumented) | A source breaks | Isolated per-source scripts; failure marked in report; recorded fixtures make breakage visible in tests; quick fix path |
| Catalog goes stale | Bad recommendations | Live stats; weekly health check; removal criteria |
| Maintainer burnout on weekly updates | Catalog decays | Scout/health tooling to keep it at 30–60 min/week; community PRs |
| Competitors add the same feature (last30days, startup-skill) | Gap closes | Ship fast; differentiate on catalog + registry coverage + evidence quality |
| Sycophancy ("every idea is great") | Useless verdicts | Rule-based verdict; DROP/UNCLEAR are first-class outcomes |
| Scope creep | Late launch | v1/v2 split; non-goals list |

## 21. Open questions

1. ~~skills.sh access method~~: resolved in M0. Use `/api/search` (undocumented); see sources-findings.md.
2. ~~MCP registry API~~: resolved in M0. Use the official registry for name-only checks and Smithery as the primary MCP source.
3. ~~Plugin marketplaces~~: resolved in M0. Use the official marketplace file; community plugins come via GitHub + skills.sh.
4. **Control case #6**: pick a genuine open-space idea for the eval set. *(Milestone 6)*
5. **Slash command name**: `/check` may collide with other skills. Alternatives: `/cbyb`, `/prebuild`. *(Milestone 2)*
6. **Card design**: visual style and branding. *(Milestone 5)*
