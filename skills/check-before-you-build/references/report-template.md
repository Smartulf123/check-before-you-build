# Report template

`report.md` is the one deliverable. It answers two questions: what already exists, and what to build it with (repos, agent skills and real products worth studying). It is not a build plan; planning skills such as brainstorming do that well. Write it in the user's language and follow `writing.md`: plain language, no emojis, no dashes as connectors, and no "·" separators. Use only items with `verified !== false`. There is no method section: when a source was thin or a link unreachable, say so in one short clause next to the claim it affects (for example "the Play Store search was thin, so confirm this yourself"). The full details stay in `evidence.json`. Sections marked *(launch)* appear only for the `launch` purpose; leave out any section that has nothing in it. Keep it short enough to read in a few minutes.

```markdown
# <Short idea title>

Checked on <date written out, e.g. 18 October 2026>, <purpose in words: "for your own use" / "as a learning project" / "for a launch">.

## Summary
**<display.headline>**

<!-- launch --> Saturation <x>/10, gap <y>/10.

<2–4 sentences: the reason for the verdict (launch) or the hint (me / fun), the closest existing project, and the recommended stack in one line. For launch, end with the angle the evidence supports in one sentence, and the verdict's way forward where it applies (already well covered: how to stand out; join an existing project: how to differ if you build your own).>

## What already exists
<!-- launch: "What already exists", me: "Tools that might save you time", fun: "Projects to learn from" -->
| Project | Type | Stars or users | Last update | License | Match | What it does |
|---|---|---|---|---|---|---|
| [name](url) | repo / skill / MCP / package / app | 4.2k stars | 3 days ago | MIT | direct | from its README, one line |

At most 10 rows. Order by match (direct, partial, adjacent), then by popularity. For `me` and `fun`, include the mainstream apps and the most popular self-hosted option. Write "maintainer pick" in the last column for catalog entries with an exception. Use the catalog's `not_for` to say why a strong project still leaves room.

## Market signals *(launch)*
How the existing products are doing, in 3–6 bullets: traction (ratings, stars, how similar launches went), the main complaints, and substitutes people use instead.
- Traction: <e.g. five App Store apps, none with more than 2 ratings; seven Show HN launches with 1 to 3 points>. [link](url)
- Complaint: [title](url). "short quote"
- Substitute: <what people use instead and why it matters>. [link](url)

Whether people want this is for you to test with real users; the next step says how.

## Gaps *(launch: full, me: short)*
1. <gap statement>. Evidence: [link](url). Checked: <where>.

## Recommended stack
One row per layer from phase 1, in build order. Picks should work together.

| Layer | Top pick | Popularity | License | Alternative | Why it fits this project |
|---|---|---|---|---|---|
| Frontend framework | [Next.js](url) | 143k stars | MIT | [SvelteKit](url) | <one line from the README, tied to this idea> |

In the Popularity column, always name the unit (stars, installs, weekly downloads) and use the main project's numbers, not a small SDK repo's.

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
1–2 lines: the one thing to do first. For `me` and `fun`: try the closest existing tool for an evening. For `launch`: the cheapest test with real people that would show whether they want it (for example ten users trying a rough prototype and whether they come back), then start from the stack above. If the user wants a step-by-step plan, suggest a planning skill such as [brainstorming](https://github.com/obra/superpowers).

## Sources
<every link used, one per line>
```

## Chat summary

Plain text, no emojis, no "·" separators, at most 8 lines:

```
<display.headline> (confidence: <confidence>)
Saturation x/10, gap y/10                             (launch only)
Closest existing: <name>, <popularity>, updated <when>, <license>
Open gap: <top gap>                                   (launch / me)
Recommended stack: <pick>, <pick>, <pick>, <pick>
Skills for your agent: <skill>, <skill>, <skill>
Next step: <one line>
Full report: check-reports/<dir>/report.md
```

Wording rule for every purpose: never write "don't build" or "you shouldn't". Describe the landscape and let the user decide.
