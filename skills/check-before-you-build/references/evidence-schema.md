# evidence.json schema

`score.mjs` validates this file. Required fields are marked ✱.

```jsonc
{
  "version": 1,
  "created": "2026-10-17T13:00:00Z",
  "mode": "standard",                       // quick | standard | deep
  "language": "en",
  "idea": {
    "text": "…",                            // ✱ the user's words
    "summary": "…",
    "purpose": "launch",                    // ✱ fun | me | launch
    "purpose_source": "default",            // explicit | inferred | default
    "form_factors": ["skill", "cli"],
    "target_user": "…",
    "search_terms": ["extract design system website", "design tokens url"],
    "components": ["headless browser automation"],
    "categories": ["agent-skills", "browser-automation"],
    "layers": [{ "layer": "frontend framework", "category": "web-frameworks" }],
    "look_and_feel": null,                  // the user's words, e.g. "fancy scroll animations", or null
    "references": []                        // apps the user named as a model, e.g. ["Notion"]
  },
  "competitors": [                          // ✱ array (may be empty)
    {
      "id": "github:owner/repo",            // ✱ source-prefixed id
      "name": "designlang",
      "url": "https://github.com/owner/repo", // ✱
      "source": "github",                   // github | skills.sh | smithery | mcp-registry | npm | pypi | claude-plugins-official | commercial | catalog
      "description": "…",
      "signals": { "stars": 4248, "pushed_at": "…", "license": "MIT", "archived": false },   // commercial products: { "traction": true } when the site shows real users or reviews
      "other_signals": { "npm:designlang": { "downloads_weekly": 790 } },
      "match": "direct",                    // ✱ direct | partial | adjacent
      "match_reason": "…",                  // ✱ for direct and partial
      "coverage_pct": 85,                   // direct matches
      "notes": "…",
      "readme_read": true,                  // required before recommending (hard rule 7)
      "verified": true                      // false = dropped by fact-checking (set by verify.mjs)
    }
  ],
  "candidates_evaluated": 34,
  "demand": [
    {
      "type": "hn_story",                   // hn_story | github_issue | request | forum | web
      "title": "…",
      "url": "https://news.ycombinator.com/item?id=…", // ✱
      "date": "2026-05-02",
      "points": 120,
      "reactions_plus1": 0,
      "comments": 30,
      "quote": "≤ 25 words, verbatim",
      "verified": true
    }
  ],
  "gaps": [
    { "statement": "…", "evidence": ["https://…"], "checked": ["designlang README"] } // statement ✱
  ],
  "gap_score": 5,
  "building_blocks": [
    {
      "id": "github:microsoft/playwright",
      "name": "Playwright",
      "url": "https://github.com/microsoft/playwright",
      "component": "headless browser automation",   // or "layer": "frontend framework"
      "role": "pick",                       // pick | alternative
      "type": "use",                        // use | fork | learn | contribute
      "license_class": "permissive",        // permissive | copyleft | none | other
      "signals": { "stars": 70000, "pushed_at": "…", "license": "Apache-2.0" },
      "from_catalog": true,
      "readme_read": true,
      "why": "…",
      "warning": null,
      "verified": true
    }
  ],
  "sources_status": { "catalog": "ok", "github": "ok", "skills": "ok", "plugins": "skipped", "mcp": "ok", "npm": "ok", "hn": "ok", "web": "ok" },
  "rate_limited": false,
  "verification": { "checked": 31, "passed": 29, "corrected": 3, "dropped": 2, "verified_at": "…" }  // written by verify.mjs

  // Written by score.mjs: scores, score_details, verdict, display, scored_at
}
```
