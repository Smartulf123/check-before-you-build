# check-before-you-build

Is this worth building, and what can I build it with?

check-before-you-build is an open-source agent skill. Describe an idea and it searches GitHub, skills.sh, Claude plugin marketplaces, MCP registries, npm, PyPI and Hacker News, then writes a report: what already exists, how those products are doing, where the gap is, a recommended stack, agent skills for your coding agent, and real products worth studying.

## Why

Building is cheap now. Spending a weekend or a month on something that already exists, or that nobody wants, is still expensive.

Most idea validators give an opinion about market size. This one collects evidence and links every claim:

- **Existing projects.** Repos, skills, MCP servers, packages and apps, with live stars, last-commit dates and licenses. The agent reads each README before judging it.
- **Market signals.** How the existing products are doing (ratings, stars, how similar launches went), what their users complain about, and what people use instead. Demand itself isn't scored: no skill can measure it reliably from public posts, so the report tells you how to test it with real people.
- **Gaps.** What the existing projects lack, with a link for each gap.
- **What to build it with.** A catalog of 1,907 quality-checked repos supplies a top pick and an alternative for every layer of the stack, plus repos to fork, learn from or contribute to, and the agent skills that help your coding agent use them.

## Install

With the open [skills](https://skills.sh) CLI (Claude Code, Codex, OpenCode, Cursor and others):

```bash
npx skills add Smartulf123/check-before-you-build
```

Or as a Claude Code plugin:

```
/plugin marketplace add Smartulf123/check-before-you-build
/plugin install check-before-you-build@check-before-you-build
```

You need Node 20 or newer. An authenticated [`gh`](https://cli.github.com/) CLI is strongly recommended: GitHub allows 10 searches a minute without it and 30 with it. No paid API keys.

## Use

Describe what you're about to build:

```
Does this already exist? A CLI that turns my time logs into invoices.
```

```
/check-before-you-build A fancy portfolio website with scroll animations --for me
```

Modes are `--quick` (catalog and GitHub only), standard (the default) and `--deep` (more queries and issue mining). Set the purpose with `--for fun`, `--for me` or `--for launch`, or let the skill infer it from your wording. In Claude Code, a check starts two research agents in parallel and takes about 10 to 15 minutes.

## What you get

Each run writes two files to `check-reports/<date>-<slug>/`:

- `report.md`, the full report
- `evidence.json`, everything collected, with scores and the fact-check log

The report has these sections:

1. **Summary.** The verdict (for launches) or a short hint (for personal and learning projects), the closest existing project and the recommended path.
2. **What already exists.** A table ordered by how closely each project matches, then by popularity.
3. **Market signals and gaps,** each item with a link.
4. **Recommended stack.** One row per layer (framework, UI, styling, database, auth, hosting and so on) with a top pick, an alternative and why it fits.
5. **Skills for your coding agent.** A design skill when there is a user interface, and the official skill for each framework or service in the stack.
6. **Building blocks for the features** that make the idea special, plus look-and-feel picks when you ask for something fancy.
7. **Products worth studying.** Up to three real apps or websites that do it well, what to look at in each, and how to study them (design extractors for websites, REA for desktop and Android apps).
8. **Next step,** in a line or two. For a step-by-step plan, hand the report to a planning skill such as [brainstorming](https://github.com/obra/superpowers).
9. **Method and sources.** What was searched, what was fact-checked and every link used.

The report is written in your language, in plain prose.

### Building for fun or for yourself

Building something that already exists is how most people learn, so the skill never tells you not to build. Tell it why you're building and the report adapts:

| Purpose | What you get |
|---|---|
| `--for fun` | No verdict. Projects worth learning from and the stack to build with. |
| `--for me` | No verdict. Existing tools that might save you time, including the mainstream apps, then the stack. |
| `--for launch` | The full verdict with market signals, gaps and how to stand out. |

## How it works

1. **Understand** the idea: summary, project type, search terms from several angles (your words, related words, developer jargon, the problem, bigger tools that might include it), the stack layers the project type needs, and any style or reference apps you mention.
2. **Research** in parallel with two agents: existing projects and market signals, and building blocks for every layer and feature.
3. **Gaps**: what existing projects lack, each with evidence.
4. **Fact-check, then score.** Every cited repo, package and link is checked again; fake or renamed repos are dropped or fixed. Fixed rules then compute the verdict from the evidence. The model never writes it.
5. **Write** the report.

The agent does the reasoning. Small, dependency-free Node scripts fetch the facts, so numbers come from APIs, not from model memory.

### Verdicts

| Verdict | Meaning |
|---|---|
| Open space, little exists yet | Little supply; test demand with real users |
| Build it with a clear angle | It exists, but there is an evidenced gap |
| Consider joining an existing project | An active, adopted, permissive project already does most of it |
| Consider reviving an abandoned project | The leader is archived or inactive and can be forked |
| Already well covered | Saturated with no evidenced gap |
| Mixed signals | The evidence doesn't point one way |

Rules and formulas: [scoring.md](skills/check-before-you-build/references/scoring.md).

## The catalog

1,907 repos in 62 building-block categories across 20 domains, from web frameworks to audio, 3D printing and games, with separate categories for coding agents, agent workbenches, agent memory, personal assistants and agent skills by topic. Every entry:

- passes one quality gate: adoption (for example 1,000+ stars), a commit in the last 6 months (18 for stable, widely used projects), a real license, 3+ contributors and a fake-star check
- has a summary, best-for and not-for written from its README and checked against it
- costs you no GitHub API calls, because stats come from a weekly snapshot

Suggest a missing repo by opening an issue.

## Evaluation

Fresh agents run the skill end to end on a fixed set of ideas. A run is graded on whether it finds the known competitors and lands on a sensible verdict. Results are in [evals/RESULTS.md](evals/RESULTS.md).

## Principles

- **Evidence over opinion.** Every claim links to a source.
- **Free.** No paid API keys.
- **Local and read-only.** No telemetry, no posting, no scraping of login-walled platforms. Your idea is sent only to the public search APIs listed above.
- **Portable.** Uses the open Agent Skills format, so it runs in Claude Code, Codex, OpenCode and other agents.

The writing rules for reports are adapted from [Humanizer](https://github.com/blader/humanizer) (MIT).

## Roadmap

- [x] Fact scripts, rule-based scoring and fact-checking
- [x] Catalog of 1,907 repos with README-based descriptions
- [x] v1.0.0
- [x] v1.1: recommended stack per layer, parallel research, plain-language writing
- [x] v1.2: agent skills and products worth studying in every report
- [ ] Weekly catalog updates in CI
- [ ] More sources (Product Hunt, VS Code marketplace, crates.io)
- [ ] Watch mode: re-check an idea later and see what changed

## Contributing

Issues and pull requests are welcome: missing repos for the catalog, sources that should be searched, or a verdict you think was wrong (attach the `evidence.json`). Run the tests with `npm test`.

## License

[MIT](LICENSE)
