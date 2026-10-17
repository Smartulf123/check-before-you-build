// Catalog quality rules (SPEC §8.2). One implementation, used by catalog-add, catalog-validate,
// health, scout and the skill itself. Same rules for every entry.
import { licenseClass } from './license.mjs';

const DAY = 24 * 60 * 60 * 1000;

export const RULES = {
  stars: { solid: 1000, top: 3000 },
  installs: { solid: 5000, top: 50000 },
  downloads_weekly: { solid: 50000, top: 500000 },
  uses: { solid: 1000, top: 10000 },
  freshness_days: { very_fresh: 30, fresh: 90, ok: 180, stable_max: 548 },
  stable_min_stars: 5000,
  min_contributors: 3,
  fake_stars: { min_stars: 1000, max_fork_ratio: 0.01, max_contributors: 2 },
};

export function daysSince(iso, now = Date.now()) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? (now - t) / DAY : null;
}

export function freshnessLabel(days) {
  if (days === null) return 'unknown';
  const f = RULES.freshness_days;
  if (days <= f.very_fresh) return 'very fresh';
  if (days <= f.fresh) return 'fresh';
  if (days <= f.ok) return 'ok';
  return 'stale';
}

/** Highest adoption level reached by any signal: 'top' | 'solid' | null. */
export function adoptionLevel(signals = {}, { official = false } = {}) {
  let level = null;
  for (const key of ['stars', 'installs', 'downloads_weekly', 'uses']) {
    const value = signals[key];
    if (value === undefined || value === null) continue;
    if (value >= RULES[key].top) return 'top';
    if (value >= RULES[key].solid) level = 'solid';
  }
  if (official) return level === 'top' ? 'top' : 'top-if-fresh';
  return level;
}

/**
 * Evaluate a repo against the quality rules.
 * @param {object} input  { signals: {stars, forks, pushed_at, license, archived, installs, downloads_weekly, uses},
 *                          contributors, official, stable, stable_reason }
 * @returns {{ pass, tier, freshness, reasons: string[], warnings: string[] }}
 */
export function evaluate(input, now = Date.now()) {
  const s = input.signals || {};
  const reasons = [];
  const warnings = [];
  const days = daysSince(s.pushed_at, now);
  const freshness = freshnessLabel(days);

  if (s.missing) reasons.push('repository not found');
  if (s.archived) reasons.push('archived');

  const cls = licenseClass(s.license);
  if (cls === 'none') reasons.push('no license');
  else if (s.license === 'NOASSERTION') {
    // A license file exists but GitHub couldn't classify it: needs a human look, not a rejection.
    warnings.push('license file present but not auto-detected: verify by hand');
  } else if (cls === 'other') reasons.push(`license not recognised (${s.license})`);

  const adoption = adoptionLevel(s, { official: Boolean(input.official) });
  if (!adoption) reasons.push(`not enough adoption (${s.stars ?? 0} stars; needs ≥ ${RULES.stars.solid} or an alternative signal)`);

  const isStable = Boolean(input.stable);
  if (isStable) {
    if ((s.stars ?? 0) < RULES.stable_min_stars) reasons.push(`stable exception needs ≥ ${RULES.stable_min_stars} stars`);
    if (!input.stable_reason) reasons.push('stable exception needs a stable_reason');
  }
  if (days === null) {
    warnings.push('last push date unknown');
  } else if (days > (isStable ? RULES.freshness_days.stable_max : RULES.freshness_days.ok)) {
    reasons.push(`last push ${Math.round(days)} days ago (limit ${isStable ? RULES.freshness_days.stable_max : RULES.freshness_days.ok})`);
  }

  const contributors = input.contributors;
  if (contributors === undefined || contributors === null) {
    warnings.push('contributor count unknown');
  } else if (contributors < RULES.min_contributors) {
    reasons.push(`only ${contributors} contributor(s) (needs ≥ ${RULES.min_contributors})`);
  }

  const fs = RULES.fake_stars;
  if (
    (s.stars ?? 0) >= fs.min_stars &&
    s.forks !== undefined &&
    s.forks / s.stars < fs.max_fork_ratio &&
    contributors !== undefined &&
    contributors !== null &&
    contributors <= fs.max_contributors
  ) {
    reasons.push('possible fake stars (very few forks and contributors for the star count)');
  }

  const pass = reasons.length === 0;
  let tier = null;
  if (pass) {
    const fresh = days !== null && days <= RULES.freshness_days.fresh;
    const topAdoption = adoption === 'top' || adoption === 'top-if-fresh';
    tier = !isStable && fresh && topAdoption ? 'top' : 'solid';
    if (freshness === 'ok') warnings.push('last push 3–6 months ago');
  }
  return { pass, tier, freshness, days_since_push: days === null ? null : Math.round(days), reasons, warnings };
}

export const TIER_LABEL = { top: '⭐ Top choice', solid: '✅ Solid' };
