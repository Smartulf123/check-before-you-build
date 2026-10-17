# check-before-you-build

**Is this worth building — and what can I build it with?**

An open-source agent skill that checks your idea against GitHub, skills.sh, Claude plugin marketplaces, MCP registries, npm and Hacker News, then gives you an honest, cited verdict and the best existing repos to build on.

> 🚧 **Status: in design.** Nothing is installable yet. The [spec](docs/SPEC.md) and [implementation plan](docs/IMPLEMENTATION_PLAN.md) are open for feedback. Target release: late November 2026.

---

## Why

Building is cheap now. The expensive mistake is spending a weekend, or a month, on something that already exists or that nobody wants.

Most idea validators give you an opinion about market size. This one shows you **evidence**:

- **Does it already exist?** Real repos, skills, MCP servers and packages, with live stars, last-commit dates and licenses.
- **Does anyone want it?** Hacker News threads, feature requests on competitors' issue trackers, real questions on the web, each with a link.
- **Where's the gap?** What the existing projects are missing, backed by evidence.
- **What should I build it with?** A curated catalog of ~300 repos tells you what to 🧱 use, 🍴 fork, 💡 learn from, or 🤝 contribute to.

## What it will look like

```
/check "A skill that extracts a website's design into DESIGN.md"
```

```
VERDICT: 🔀 BUILD WITH AN ANGLE   (confidence: high)
Saturation 9/10 · Demand 8/10 · Gap 5/10

Closest existing: designlang — 4.2k ⭐, updated 3 days ago, MIT
Also: dembrandt (3.6k ⭐), firecrawl-website-design-clone (33k installs)
Open gap: no tool verifies that the extracted design reproduces the original
Building blocks: 🧱 playwright · 🧱 @google/design.md · 🍴 dembrandt extractor (MIT)
Next step: contribute a "verify" mode to designlang, or build verify-first.
```

You also get a full Markdown report with every source, a machine-readable evidence file, and a shareable verdict card.

## How it works

1. **Understand** the idea: core concept, form factor, search terms, components.
2. **Supply**: search the catalog, GitHub, skills.sh, plugin marketplaces, MCP registries, npm and PyPI.
3. **Demand**: Hacker News, competitors' GitHub issues, the web.
4. **Gaps**: what existing projects lack, with evidence.
5. **Building blocks**: catalog first, then live search; license-aware recommendations.
6. **Verdict**: computed by fixed rules from the evidence, not written by the model. `DROP` and `UNCLEAR` are real outcomes.
7. **Fact-check**: every cited repo and link is re-verified live before the report is written.

The agent does the reasoning. Small, dependency-free Node scripts fetch the facts, so numbers come from APIs, not from model memory.

## Principles

- **Evidence over opinion**: every claim links to a source.
- **Free**: no paid API keys. Works best with an authenticated [`gh`](https://cli.github.com/) CLI.
- **Local and read-only**: no telemetry, no posting, no scraping of login-walled platforms.
- **Portable**: Claude Code first, plus Codex and OpenCode via the open Agent Skills format.
- **Alive**: the catalog is reviewed and updated every week.

## Planned install

```bash
npx skills add Smartulf123/check-before-you-build
```

Or as a Claude Code plugin:

```
/plugin marketplace add Smartulf123/check-before-you-build
/plugin install check-before-you-build@check-before-you-build
```

## Roadmap

- [x] Research and spec
- [ ] Source verification and repo skeleton
- [ ] Helper scripts (GitHub, npm, PyPI, MCP registry, skills.sh, HN)
- [ ] End-to-end quick mode
- [ ] Demand, gaps and building blocks
- [ ] Catalog: ~300 repos in ~35 categories
- [ ] Rule-based scoring, fact-checking, report and verdict card
- [ ] Evaluation set passing, packaging, v1.0.0

See the [implementation plan](docs/IMPLEMENTATION_PLAN.md) for details.

## Contributing

Feedback on the [spec](docs/SPEC.md) is very welcome. Open an issue. Once the catalog exists, you'll be able to suggest repos through an issue template.

## License

[MIT](LICENSE)
