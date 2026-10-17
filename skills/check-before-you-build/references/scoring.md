# Scoring

`score.mjs` computes everything below. This file explains what the agent must supply and how to interpret the result.

## What the agent supplies

| Field | Rule |
|---|---|
| `competitors[].match` | `direct` / `partial` / `adjacent` (see methodology, phase 2) |
| `competitors[].match_reason` | Required for direct and partial |
| `competitors[].coverage_pct` | Direct matches: how much of the idea (0–100) this project already delivers. Drives CONTRIBUTE (≥ 80) and FORK (≥ 60) |
| `demand[]` | Typed items with URLs (methodology, phase 3) |
| `gaps[]` + `gap_score` | Evidenced gap statements and a 0–10 score from the rubric below |

## Gap rubric

| Score | Meaning |
|---|---|
| 0–2 | No gap found; top competitors cover the idea well |
| 3–4 | Minor gaps (polish, small missing features), weak evidence |
| 5–6 | One clear, evidenced gap the top competitors lack |
| 7–8 | Several evidenced gaps, or top competitors are stale |
| 9–10 | No real competitor, or all stale/archived, while demand exists |

`score.mjs` caps the score by the number of gap statements that have evidence: none → 2, one → 6, two or three → 8, four or more → 10. With no active direct competitor the cap is lifted (10).

## Formulas

- **popularity** (0–1): each signal is normalised on its own scale (stars `log10(n+1)/4` · installs `/4.5` · npm weekly downloads `/5` · Smithery uses `/4`), and the **strongest** across `signals` and `other_signals` wins. Raw numbers are never mixed. Commercial products: 0.7 with traction, else 0.4
- **activity:** archived 0 · pushed ≤ 90 days 1.0 · ≤ 365 days 0.6 · older 0.2 · unknown 0.6
- **saturation** = `10 × (1 − e^(−Σ match_weight × activity × popularity))`, with match weights direct 1.0 · partial 0.5 · adjacent 0.1
- **demand** = `10 × (1 − e^(−D/4))`. D sums: request/forum/web 1.0 · GitHub issue 0.3 (0.6 with ≥ 1 thumbs-up, 1.5 with ≥ 10 thumbs-up) · HN story 0.3 (1.5 with ≥ 50 points) · items dated more than 3 years ago count a third · plus 2.0 for each direct competitor with popularity ≥ 0.8 (max 2)
- Items with `verified: false` are ignored.

## Verdict rules (first match wins)

| # | Condition | Verdict | Shown as |
|---|---|---|---|
| 1 | demand < 3 | DROP | Verdict: already well covered |
| 2 | saturation ≥ 7 and gap < 3, or saturation ≥ 9 and gap < 5 | DROP | Verdict: already well covered |
| 3 | a direct competitor active ≤ 90 days, permissive, coverage ≥ 80 %, popularity ≥ 0.6 | CONTRIBUTE | Verdict: consider joining an existing project |
| 4 | the most popular direct competitor is archived or inactive > 365 days, permissive, coverage ≥ 60 %, popularity ≥ 0.6 | FORK | Verdict: consider reviving an abandoned project |
| 5 | saturation < 4 and demand ≥ 4 | BUILD | Verdict: open space, worth building |
| 6 | gap ≥ 5 | BUILD_WITH_ANGLE | Verdict: build it with a clear angle |
| 7 | otherwise | UNCLEAR | Verdict: mixed signals |

Every verdict in the report comes with a way forward:
- DROP → "If you build it anyway, here's how to stand out"
- CONTRIBUTE → plus "If you'd rather build your own, here's how to differ"
- FORK → plus "Or start fresh with these building blocks"

## Confidence

- **low:** 2+ sources failed, under 5 candidates, or rate-limited
- **medium:** 1 source failed, 5–9 candidates, or facts not verified (< 90 % passed)
- **high:** otherwise

Show low confidence prominently, and say that absence of evidence is not evidence of absence.
