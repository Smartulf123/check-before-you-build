#!/usr/bin/env node
// Scores and verdict from evidence.json (SPEC §9). The model may not override the verdict.
// Usage: node score.mjs <evidence.json> [--dry-run] [--now YYYY-MM-DD]
import { readFile, writeFile } from 'node:fs/promises';
import { errorObject, isMain, parseArgs } from './lib/cli.mjs';
import { licenseClass } from './lib/license.mjs';

const DAY = 24 * 60 * 60 * 1000;
const MATCH_WEIGHT = { direct: 1.0, partial: 0.5, adjacent: 0.1 };
const round1 = (x) => Math.round(x * 10) / 10;

export const LABELS = {
  BUILD: '✅ Open space: go build it',
  BUILD_WITH_ANGLE: '🔀 Build it with an angle',
  CONTRIBUTE: '🤝 You could join an existing project',
  FORK: '🍴 Revive an abandoned project',
  DROP: '📚 Already well covered',
  UNCLEAR: '❔ Mixed signals',
};

const POPULARITY_SCALE = { stars: 4, installs: 4.5, downloads_weekly: 5, uses: 4 };

function signalPopularity(s = {}) {
  const values = Object.entries(POPULARITY_SCALE)
    .filter(([key]) => s[key] !== undefined && s[key] !== null)
    .map(([key, div]) => Math.min(1, Math.log10((Number(s[key]) || 0) + 1) / div));
  return values.length ? Math.max(...values) : null;
}

/**
 * 0–1 popularity. Each signal is normalised on its own scale (raw numbers are never mixed);
 * the strongest normalised signal across the project's sources wins. Example: a skill with
 * 246 stars but 130k installs is popular.
 */
export function popularity(c) {
  const candidates = [c.signals, ...Object.values(c.other_signals || {})].map(signalPopularity).filter((v) => v !== null);
  if (candidates.length) return Math.max(...candidates);
  if (c.source === 'commercial' || c.type === 'commercial') return c.signals?.traction ? 0.7 : 0.4;
  return 0.3;
}

export function daysSincePush(c, now) {
  const pushed = c.signals?.pushed_at || c.signals?.published_at;
  if (!pushed) return null;
  return (now - new Date(pushed).getTime()) / DAY;
}

/** Activity factor: archived 0 · ≤ 90 d 1.0 · ≤ 365 d 0.6 · older 0.2 · unknown 0.6. */
export function activity(c, now) {
  if (c.signals?.archived) return 0;
  const days = daysSincePush(c, now);
  if (days === null) return 0.6;
  if (days <= 90) return 1.0;
  if (days <= 365) return 0.6;
  return 0.2;
}

const usable = (items = []) => items.filter((x) => x.verified !== false);

export function saturation(competitors, now) {
  const coverage = usable(competitors).reduce(
    (sum, c) => sum + (MATCH_WEIGHT[c.match] ?? 0) * activity(c, now) * popularity(c),
    0,
  );
  return { coverage: round1(coverage), score: round1(10 * (1 - Math.exp(-coverage))) };
}

export function demandWeight(item) {
  if (item.type === 'hn_story') return (item.points ?? 0) >= 50 ? 1.5 : 0.3;
  if (item.type === 'github_issue') {
    // An issue nobody reacted to is one person's wish, not demand (tuned after the M6 eval runs).
    const plus1 = item.reactions_plus1 ?? 0;
    return plus1 >= 10 ? 1.5 : plus1 >= 1 ? 0.6 : 0.3;
  }
  return 1.0; // request, forum, web, blog: an explicit request or complaint
}

export function demand(items, competitors) {
  const fromItems = usable(items).reduce((sum, d) => sum + demandWeight(d), 0);
  const strongAdoption = usable(competitors).filter((c) => c.match === 'direct' && popularity(c) >= 0.8).length;
  const D = fromItems + 2.0 * Math.min(strongAdoption, 2);
  return { raw: round1(D), score: round1(10 * (1 - Math.exp(-D / 4))) };
}

/**
 * Model-scored gap, capped by the evidence so the verdict doesn't hinge on gut feel:
 * no evidenced gap → ≤ 2 · one → ≤ 6 · two or three → ≤ 8 · four+, or no active direct competitor → ≤ 10.
 */
export function gapCap(evidencedCount, noActiveDirect) {
  if (noActiveDirect || evidencedCount >= 4) return 10;
  if (evidencedCount >= 2) return 8;
  if (evidencedCount === 1) return 6;
  return 2;
}

export function gap(evidence, now = Date.now()) {
  const evidenced = (evidence.gaps || []).filter((g) => g.statement && (g.evidence || []).length > 0);
  const direct = usable(evidence.competitors).filter((c) => c.match === 'direct');
  const noActiveDirect = direct.every((c) => c.signals?.archived || (daysSincePush(c, now) ?? 0) > 365);
  const cap = gapCap(evidenced.length, noActiveDirect);
  const raw = Number(evidence.gap_score ?? 0);
  return { score: Math.max(0, Math.min(cap, raw)), evidenced_gaps: evidenced.length, cap };
}

/** A project worth joining or reviving needs real adoption (≈ 250+ stars or equivalent). */
export const MIN_ADOPTION_TO_JOIN = 0.6;

export function decideVerdict({ sat, dem, gapScore, competitors, now }) {
  const direct = usable(competitors).filter((c) => c.match === 'direct');
  const permissive = (c) => licenseClass(c.signals?.license) === 'permissive';

  if (dem < 3) return { code: 'DROP', rule: 1, reason: 'Little evidence that people want this.' };
  if (sat >= 7 && gapScore < 3) return { code: 'DROP', rule: 2, reason: 'Well covered by existing projects, with no clear open angle.' };

  const joinable = direct.find((c) => {
    const days = daysSincePush(c, now);
    return (
      days !== null && days <= 90 && !c.signals?.archived && permissive(c) &&
      (c.coverage_pct ?? 0) >= 80 && popularity(c) >= MIN_ADOPTION_TO_JOIN
    );
  });
  if (joinable) return { code: 'CONTRIBUTE', rule: 3, reason: `${joinable.name} is active and already covers most of the idea.`, target: joinable.id };

  const best = [...direct].sort((a, b) => popularity(b) - popularity(a))[0];
  if (best) {
    const days = daysSincePush(best, now);
    const inactive = best.signals?.archived || (days !== null && days > 365);
    if (inactive && permissive(best) && (best.coverage_pct ?? 60) >= 60 && popularity(best) >= MIN_ADOPTION_TO_JOIN) {
      return { code: 'FORK', rule: 4, reason: `${best.name} fits well but is no longer maintained.`, target: best.id };
    }
  }

  if (sat < 4 && dem >= 4) return { code: 'BUILD', rule: 5, reason: 'Little existing coverage, and there is demand.' };
  if (gapScore >= 5) return { code: 'BUILD_WITH_ANGLE', rule: 6, reason: 'Existing projects cover the idea, but an evidenced gap is open.' };
  return { code: 'UNCLEAR', rule: 7, reason: 'The evidence is mixed. See what to research next.' };
}

const isFailed = (status) => status === 'failed' || (status && typeof status === 'object' && status.failed);

export function confidence(evidence) {
  const statuses = Object.values(evidence.sources_status || {});
  const failedSources = statuses.filter(isFailed).length;
  const candidates = evidence.candidates_evaluated ?? (evidence.competitors || []).length;
  const v = evidence.verification;
  const verifiedRatio = v?.checked ? v.passed / v.checked : null;
  const rateLimited = Boolean(evidence.rate_limited);

  if (failedSources >= 2 || candidates < 5 || rateLimited) return 'low';
  if (failedSources === 1 || candidates < 10) return 'medium';
  if (verifiedRatio === null || verifiedRatio < 0.9) return 'medium'; // high requires fact-checking
  return 'high';
}

/** What the user sees, by purpose (SPEC §4.1, §9.7). */
export function display(code, purpose, satScore) {
  if (purpose === 'fun') return { headline: "🎓 Building for fun: great! Here's what helps.", show_verdict: false };
  if (purpose === 'me') {
    return {
      headline: '🛠️ Building for yourself.',
      hint: satScore >= 7
        ? 'Existing tools might save you time. Building your own is still a fine choice.'
        : 'Not much exists, so building your own makes sense.',
      show_verdict: false,
    };
  }
  return { headline: LABELS[code], show_verdict: true };
}

export function validateEvidence(e) {
  const errors = [];
  if (!e || typeof e !== 'object') return ['evidence must be a JSON object'];
  if (!e.idea?.text) errors.push('idea.text is required');
  if (!['fun', 'me', 'launch'].includes(e.idea?.purpose)) errors.push('idea.purpose must be fun | me | launch');
  if (!Array.isArray(e.competitors)) errors.push('competitors must be an array');
  if (e.demand !== undefined && !Array.isArray(e.demand)) errors.push('demand must be an array');
  (e.competitors || []).forEach((c, i) => {
    if (!c.id || !c.url) errors.push(`competitors[${i}] needs id and url`);
    if (!(c.match in MATCH_WEIGHT)) errors.push(`competitors[${i}].match must be direct | partial | adjacent`);
    if ((c.match === 'direct' || c.match === 'partial') && !c.match_reason) errors.push(`competitors[${i}] needs match_reason`);
  });
  (e.demand || []).forEach((d, i) => {
    if (!d.url) errors.push(`demand[${i}] needs a url`);
  });
  (e.gaps || []).forEach((g, i) => {
    if (!g.statement) errors.push(`gaps[${i}] needs a statement`);
  });
  return errors;
}

export function scoreEvidence(evidence, now = Date.now()) {
  const errors = validateEvidence(evidence);
  if (errors.length) {
    const err = new Error(`invalid evidence: ${errors.join('; ')}`);
    err.name = 'ValidationError';
    throw err;
  }
  const competitors = evidence.competitors || [];
  const sat = saturation(competitors, now);
  const dem = demand(evidence.demand || [], competitors);
  const g = gap(evidence, now);
  const verdict = decideVerdict({ sat: sat.score, dem: dem.score, gapScore: g.score, competitors, now });
  return {
    scores: { saturation: sat.score, demand: dem.score, gap: g.score },
    score_details: { coverage: sat.coverage, demand_raw: dem.raw, evidenced_gaps: g.evidenced_gaps, gap_cap: g.cap },
    verdict: { ...verdict, label: LABELS[verdict.code], confidence: confidence(evidence) },
    display: display(verdict.code, evidence.idea.purpose, sat.score),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [file] = args._;
  const out = (obj) => process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
  if (!file) {
    out({ ok: false, error: { type: 'Usage', message: 'score.mjs <evidence.json> [--dry-run] [--now YYYY-MM-DD]' } });
    process.exitCode = 1;
    return;
  }
  try {
    const evidence = JSON.parse(await readFile(file, 'utf8'));
    const now = typeof args.flags.now === 'string' ? new Date(args.flags.now).getTime() : Date.now();
    const result = scoreEvidence(evidence, now);
    if (!args.flags['dry-run']) {
      await writeFile(file, JSON.stringify({ ...evidence, ...result, scored_at: new Date(now).toISOString() }, null, 2) + '\n');
    }
    out({ ok: true, file, written: !args.flags['dry-run'], ...result });
  } catch (err) {
    out({ ok: false, error: errorObject(err) });
    process.exitCode = 1;
  }
}

if (isMain(import.meta.url)) main();
