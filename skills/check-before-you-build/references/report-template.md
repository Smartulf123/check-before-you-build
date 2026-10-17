# Report template

Write `report.md` in the user's language. Use only items with `verified !== false`. Sections marked *(launch)* appear only for the `launch` purpose.

```markdown
# Check: <short idea title>

<date> · mode: <mode> · confidence: <confidence> · purpose: <purpose>

## <display.headline>
<!-- launch -->
**Saturation <x>/10 · Demand <y>/10 · Gap <z>/10**
<verdict.reason> <one sentence of context>
<!-- me -->
<display.hint>
<!-- fun -->
How common is this: <one honest, friendly line>

## Closest existing projects
<!-- launch: "Closest existing projects" · me: "Existing tools that might save you time" · fun: "Projects to learn from" -->
| Project | Type | Popularity | Last update | License | Match | Note |
|---|---|---|---|---|---|---|
| [name](url) | repo / skill / MCP / package / product | 4.2k ⭐ · 33k installs · 790/wk | 3 days ago | MIT | direct | one line |

## Demand *(launch)*
- **Hacker News:** [title](url): 120 points, 2026-05. "short quote"
- **GitHub issues:** [#123 title](url): 14 👍
- **Web:** [title](url): "short quote"

## Gaps *(launch: full · me: short)*
1. **<gap statement>**: evidence: [link](url). Checked: <where>.

## Building blocks
**🧱 Use:** [name](url): <why> (stars · license)
**🍴 Fork:** [name](url): <why> (license ✅/⚠️)
**💡 Learn from:** [name](url): <what to look at>
**🤝 Contribute:** [name](url): <what you could add>

## Suggested plan
<!-- launch: 3–5 steps following the verdict · me: build plan · fun: learning path -->
1. …

## What would change the verdict *(launch)*
- …

<!-- verdict-specific way forward -->
<!-- DROP: "If you build it anyway, here's how to stand out: …" -->
<!-- CONTRIBUTE: "If you'd rather build your own, here's how to differ: …" -->
<!-- FORK: "Or start fresh with these building blocks: …" -->

## Method and coverage
- Sources: <list with ok / failed / skipped>
- Candidates evaluated: <n> · Fact-checked: <passed>/<checked> (corrected <c>, dropped <d>)
- <notes on rate limits or thin results; suggest `gh auth login` if unauthenticated>

## Sources
<every link used, one per line>
```

## Chat summary

```
<display.headline>   (confidence: <confidence>)
Saturation x/10 · Demand y/10 · Gap z/10            ← launch only
Closest existing: <name> — <popularity>, updated <when>, <license>
Also: <name> (<popularity>), <name> (<popularity>)
Open gap: <top gap>                                  ← launch / me
Building blocks: 🧱 … · 🧱 … · 🍴 …
Next step: <one line>
Full report → check-reports/<dir>/report.md
```

Wording rule for every purpose: never write "don't build" or "you shouldn't". Describe the landscape and let the user decide.
