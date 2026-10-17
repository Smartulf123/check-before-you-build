# Report template

`report.md` is the one deliverable. It should work as a build guide: someone who reads only this file knows what exists, what to build with and what to do first. Write it in the user's language and follow `writing.md` (plain language, no emojis, no dashes as connectors). Use only items with `verified !== false`. Sections marked *(launch)* appear only for the `launch` purpose; leave out any section that has nothing in it.

```markdown
# <Short idea title>

<date> · mode: <mode> · purpose: <purpose> · confidence: <confidence>

## Summary
**<display.headline>**
<!-- launch --> Saturation <x>/10 · Demand <y>/10 · Gap <z>/10
<2–4 sentences: the reason for the verdict (launch) or the hint (me / fun), the closest existing project, and the recommended path in one line.>

## What already exists
<!-- launch: "What already exists" · me: "Tools that might save you time" · fun: "Projects to learn from" -->
| Project | Type | Popularity | Last update | License | Match | What it does |
|---|---|---|---|---|---|---|
| [name](url) | repo / skill / MCP / package / app | 4.2k stars · 33k installs · 790/week | 3 days ago | MIT | direct | from its README, one line |

Order by match (direct, partial, adjacent), then by popularity. For `me` and `fun`, include the mainstream apps and the most popular self-hosted option. Write "maintainer pick" in the last column for catalog entries with an exception. Use the catalog's `not_for` to say why a strong project still leaves room.

## Demand *(launch)*
- Hacker News: [title](url), 120 points, 2026-05. "short quote"
- GitHub issue: [#123 title](url), 14 thumbs-up
- Web: [title](url). "short quote"

## Gaps *(launch: full · me: short)*
1. <gap statement>. Evidence: [link](url). Checked: <where>.

## Recommended stack
One row per layer from phase 1, in build order. Picks should work together.

| Layer | Top pick | Alternative | Why it fits this project |
|---|---|---|---|
| Frontend framework | [Next.js](url) · 143k stars · MIT | [SvelteKit](url) · 20k stars · MIT | <one line from the README, tied to this idea> |

After the table, one line per layer only where there is something to watch out for (from `not_for` or the README).

## Building blocks for the features
For each idea-specific component: 2–3 options with type (Use / Fork / Learn from / Contribute), why it fits (from its README), what to watch out for, stars and license.

- **<component>:** [name](url), Use. <why>. Watch out: <limit>. (27k stars · MIT)

## Look and feel *(when the user asked for it)*
2–3 picks for the requested style (scroll-driven pages, motion, 3D), each with what it gives the design and what it costs (bundle size, learning curve).

## Study the competition *(when a closed competitor or a named reference app is worth studying)*
Which product to study, what to look at, and the tool for it (REA for apps and binaries, design-extract or dembrandt for a website's design). One line: study how it works, but code and designs stay under their owners' licenses.

## Build plan
A numbered plan someone can follow, specific to this idea and stack. For each step: what to do, which pick from above it uses, and what "done" looks like. Only include install commands you saw in a README; never invent one.

1. Decide: <try the closest existing tool first if purpose is me or fun, with a time box>
2. Set up the project: <framework, styling, UI components>
3. Data: <database and data model for this idea>
4. Core feature: <the main screen or flow>
5. Second feature: <…>
6. Look and feel: <only if requested>
7. Accounts and safety: <auth, backups, privacy where personal data is involved>
8. Go online: <hosting and deploy pick>
9. <launch: how to stand out, where to announce · fun: what to learn next>

## What would change the verdict *(launch)*
- …

<!-- verdict-specific way forward, one short paragraph -->
<!-- DROP: "If you build it anyway, here's how to stand out: …" -->
<!-- CONTRIBUTE: "If you'd rather build your own, here's how to differ: …" -->
<!-- FORK: "Or start fresh with the stack above." -->

## Method and coverage
- Sources: <list with ok / failed / skipped>
- Candidates evaluated: <n> · READMEs read: <n> · Fact-checked: <passed>/<checked> (corrected <c>, dropped <d>)
- Catalog stats as of <snapshot date>; other numbers fetched live
- <dropped or corrected items, if any, one line each>
- <notes on rate limits or thin results; suggest `gh auth login` if unauthenticated>

## Sources
<every link used, one per line>
```

## Chat summary

Plain text, no emojis, at most 8 lines:

```
<display.headline> (confidence: <confidence>)
Saturation x/10 · Demand y/10 · Gap z/10            (launch only)
Closest existing: <name>, <popularity>, updated <when>, <license>
Open gap: <top gap>                                  (launch / me)
Recommended stack: <pick> · <pick> · <pick> · <pick>
Next step: <one line>
Full report and build plan: check-reports/<dir>/report.md
```

Wording rule for every purpose: never write "don't build" or "you shouldn't". Describe the landscape and let the user decide.
