# check-before-you-build

Is this worth building, and what can I build it with?

Describe an idea to your coding agent and get a report back: what already exists, how those products are doing, where the gap is, what to build it with, which agent skills help, and which real products are worth studying. Every repo, link and number in the report is checked before you see it.

[![check-before-you-build in 35 seconds](media/promo-preview.webp)](media/promo.mp4)

[Watch it with sound (35 seconds)](media/promo.mp4)

## Install

With the [skills](https://skills.sh) CLI (Claude Code, Codex, OpenCode, Cursor and other agents):

```bash
npx skills add Smartulf123/check-before-you-build
```

Or as a Claude Code plugin:

```
/plugin marketplace add Smartulf123/check-before-you-build
/plugin install check-before-you-build@check-before-you-build
```

You need Node 20 or newer. A logged-in [GitHub CLI](https://cli.github.com/) (`gh auth login`) is strongly recommended, because GitHub allows far more searches with it. No paid API keys.

## Use

Describe what you want to build, in your own words and your own language:

```
/check-before-you-build A mobile app that turns a photo of my fridge into recipe ideas. I want to launch it.
```

```
/check-before-you-build A website for myself that tracks my sleep, weight and workouts.
```

Or just ask: "Does this already exist? A CLI that turns my time logs into invoices."

A check takes about 10 to 15 minutes. Add `--quick` for a faster, lighter check or `--deep` for a more thorough one.

## What you get

A `report.md` file in `check-reports/`, written in plain language:

- **Summary:** the verdict, the closest existing product and the angle the evidence supports
- **What already exists:** the closest projects and apps, with stars or ratings, last update and license
- **Market signals** (for launches): how the existing products are doing, what their users complain about, and what people use instead
- **Gaps:** what the existing products lack, each with a link
- **Recommended stack:** a top pick and an alternative for every part of the project, from framework to hosting
- **Skills for your coding agent:** the skills that help your agent build with that stack
- **Building blocks** for the features that make your idea special, and look-and-feel picks when you ask for something fancy
- **Products worth studying:** real apps and websites that do it well, what to look at in each, and how to study them
- **Next step:** the one thing to do first

An excerpt from a real check of the fridge-photo app:

> **Verdict: build it with a clear angle.** At least six iPhone apps already turn a fridge photo into recipes, but the best has 10 App Store ratings, and similar launches on Hacker News scored 1 to 3 points. The real competition is free: SuperCook (22K ratings, no photo) and asking ChatGPT with a photo. The angle the evidence supports: free first scans on iPhone and Android, and a fridge the app remembers between photos.

## Building for fun, for yourself, or for a launch

Building something that already exists is how most people learn, so the report never tells you not to build. It adapts to why you're building:

| You say | You get |
|---|---|
| "just for fun", "to learn" | No verdict. Projects worth learning from and what to build with. |
| "for myself", "for my team" | No verdict. Existing tools that might save you time, then what to build with. |
| "I want to launch it" | A verdict, market signals, gaps and how to stand out. |

You can also set it directly with `--for fun`, `--for me` or `--for launch`.

## Verdicts

| Verdict | Meaning |
|---|---|
| Open space, little exists yet | Hardly anything does this; test with real users whether people want it |
| Build it with a clear angle | It exists, but there's an evidenced gap you can own |
| Consider joining an existing project | An active, open-source project already does most of it |
| Consider reviving an abandoned project | The best project is abandoned and can be forked |
| Already well covered | Crowded, with no clear gap |
| Mixed signals | The evidence doesn't point one way |

## Where it looks

- GitHub, plus a built-in catalog of 1,900+ quality-checked repos
- npm and PyPI packages
- App stores and product websites through web search
- Hacker News launches
- skills.sh, Claude plugins and MCP registries, when your idea is itself an agent tool

## Privacy

The skill only reads public sources. It never posts, stars, forks or installs anything, and it has no telemetry. Your idea is sent only to the public search services listed above.

## Contributing

Suggestions are welcome: a repo missing from the catalog, a source worth searching, or a verdict you think was wrong (attach the `evidence.json` from your check). Open an issue or a pull request. Run the tests with `npm test`.

## License

[MIT](LICENSE)
