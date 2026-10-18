# Report template

`report.md` is the one deliverable. It answers two questions: what already exists, and what to build it with (repos, agent skills and real products worth studying). It is not a build plan; planning skills such as brainstorming do that well. Write it in the user's language and follow `writing.md`: plain language, no emojis, no dashes as connectors, and no "·" separators. Use only items with `verified !== false`. Sections marked *(launch)* appear only for the `launch` purpose; leave out any section that has nothing in it. Keep it short enough to read in a few minutes.

```markdown
# <Short idea title>

Checked on <date written out, e.g. 18 October 2026>, <purpose in words: "for your own use" / "as a learning project" / "for a launch">.

## Summary
**<display.headline>**
<!-- launch --> Saturation <x>/10, demand <y>/10, gap <z>/10.
<2–4 sentences: the reason for the verdict (launch) or the hint (me / fun), the closest existing project, and the recommended stack in one line.>

## What already exists
<!-- launch: "What already exists", me: "Tools that might save you time", fun: "Projects to learn from" -->
| Project | Type | Stars or users | Last update | License | Match | What it does |
|---|---|---|---|---|---|---|
| [name](url) | repo / skill / MCP / package / app | 4.2k stars | 3 days ago | MIT | direct | from its README, one line |

At most 10 rows. Order by match (direct, partial, adjacent), then by popularity. For `me` and `fun`, include the mainstream apps and the most popular self-hosted option. Write "maintainer pick" in the last column for catalog entries with an exception. Use the catalog's `not_for` to say why a strong project still leaves room.

## Demand *(launch)*
- Hacker News: [title](url), 120 points, May 2026. "short quote"
- GitHub issue: [#123 title](url), 14 thumbs-up
- Web: [title](url). "short quote"

## Gaps *(launch: full, me: short)*
1. <gap statement>. Evidence: [link](url). Checked: <where>.

## Recommended stack
One row per layer from phase 1, in build order. Picks should work together.

| Layer | Top pick | Stars | License | Alternative | Why it fits this project |
|---|---|---|---|---|---|
| Frontend framework | [Next.js](url) | 143k | MIT | [SvelteKit](url) | <one line from the README, tied to this idea> |

After the table, one line per layer only where there is something to watch out for (from `not_for` or the README).

## Skills for your coding agent
3–6 agent skills that help the user's coding agent build this with the stack above: a frontend or design skill when there is a user interface, the official skill for each picked framework, database or service where one exists, and at most one general workflow skill.

| Skill | Helps with | Installs or stars | Why |
|---|---|---|---|
| [name](url) | frontend design | 120k installs | <one line from its SKILL.md or README> |

Add one install line per skill only if you saw it in the skill's README or on its skills.sh page (for example `npx skills add owner/repo`).

## Building blocks for the features
For each idea-specific component: 2–3 options with type (Use, Fork, Learn from or Contribute), why it fits (from its README), what to watch out for, stars and license.

- **<component>:** [name](url), Use. <why>. Watch out: <limit>. (27k stars, MIT)

## Look and feel *(when the user asked for it)*
2–3 picks for the requested style (scroll-driven pages, motion, 3D), each with what it gives the design and what it costs (bundle size, learning curve).

## Products worth studying
Up to 3 real apps or websites, found in this run, that do the idea or a key part of it very well. For each: what to look at (a specific screen or flow), and how to study it:
- a website: open it, and run [design-extract](https://github.com/Manavarya09/design-extract) or [dembrandt](https://github.com/dembrandt/dembrandt) on its URL to get its colors, fonts and spacing
- a desktop (Electron) or Android app: [REA](https://github.com/morluto/rea) shows how a feature is built
- an iOS app: use it and screenshot the flows (App Store apps are encrypted, so code-level study isn't practical)

End with one line: learn the patterns and make them your own; code, images, icons and a look-alike design stay the owner's, and many apps' terms forbid reverse engineering.

## Next step
1–2 lines: the one thing to do first (for `me` and `fun`: try the closest existing tool for an evening; otherwise: start from the stack above). If the user wants a step-by-step plan, suggest a planning skill such as [brainstorming](https://github.com/obra/superpowers).

## What would change the verdict *(launch)*
- …

<!-- verdict-specific way forward, one short paragraph -->
<!-- DROP: "If you build it anyway, here's how to stand out: …" -->
<!-- CONTRIBUTE: "If you'd rather build your own, here's how to differ: …" -->
<!-- FORK: "Or start fresh with the stack above." -->

## Method and coverage
- Mode: <mode>. Confidence: <confidence>.
- Sources: <list with ok, failed or skipped>
- Candidates evaluated: <n>. READMEs read: <n>. Fact-checked: <passed> of <checked> (corrected <c>, dropped <d>).
- Catalog stats as of <snapshot date>; other numbers fetched live.
- <dropped or corrected items, if any, one line each>
- <notes on rate limits or thin results; suggest `gh auth login` if unauthenticated>

## Sources
<every link used, one per line>
```

## Chat summary

Plain text, no emojis, no "·" separators, at most 8 lines:

```
<display.headline> (confidence: <confidence>)
Saturation x/10, demand y/10, gap z/10                (launch only)
Closest existing: <name>, <popularity>, updated <when>, <license>
Open gap: <top gap>                                   (launch / me)
Recommended stack: <pick>, <pick>, <pick>, <pick>
Skills for your agent: <skill>, <skill>, <skill>
Next step: <one line>
Full report: check-reports/<dir>/report.md
```

Wording rule for every purpose: never write "don't build" or "you shouldn't". Describe the landscape and let the user decide.
