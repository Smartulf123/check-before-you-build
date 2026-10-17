// Live quality check for one repo: GitHub stats + contributors + optional npm/skills.sh signals,
// evaluated with the shared rules in skills/.../scripts/lib/criteria.mjs.
import { getContributorsCount, getRepo } from '../../skills/check-before-you-build/scripts/github.mjs';
import { packageInfo } from '../../skills/check-before-you-build/scripts/npm.mjs';
import { searchSkills } from '../../skills/check-before-you-build/scripts/skills.mjs';
import { evaluate } from '../../skills/check-before-you-build/scripts/lib/criteria.mjs';

/** Look up a skill's install count by searching skills.sh for its skill id. */
async function skillInstalls(skillId) {
  const name = skillId.split('/').pop();
  const { results } = await searchSkills([name], { limit: 100 });
  const hit = results.find((r) => r.id === `skills:${skillId}`);
  return hit ? hit.signals.installs : null;
}

/**
 * GitHub reports NOASSERTION when a license file exists but can't be classified (common for
 * MIT with a custom header). Resolve it from the npm package, but only if that package points
 * back to the same GitHub repo.
 */
async function licenseFromNpm(fullName, npmName) {
  const repoName = fullName.split('/')[1];
  for (const name of [npmName, repoName, repoName.toLowerCase()].filter(Boolean)) {
    try {
      const pkg = await packageInfo(name);
      if (pkg.found && pkg.result.github?.toLowerCase() === fullName.toLowerCase() && pkg.result.signals.license) {
        return pkg.result.signals.license;
      }
    } catch {
      // try the next name
    }
  }
  return null;
}

/**
 * @param {string} id owner/repo
 * @param {object} meta optional entry fields: npm, skill, official, stable, stable_reason
 */
export async function checkRepo(id, meta = {}) {
  const repo = await getRepo(id);
  if (!repo.found) {
    return { id, found: false, evaluation: evaluate({ signals: { missing: true } }) };
  }
  const signals = { ...repo.result.signals };
  const contributors = await getContributorsCount(repo.result.full_name);
  if (!signals.license || signals.license === 'NOASSERTION') {
    const resolved = await licenseFromNpm(repo.result.full_name, meta.npm);
    if (resolved) {
      signals.license = resolved;
      signals.license_source = 'npm';
    }
  }
  if (meta.npm) {
    try {
      const pkg = await packageInfo(meta.npm);
      if (pkg.found) signals.downloads_weekly = pkg.result.signals.downloads_weekly;
    } catch {
      // the npm signal is optional
    }
  }
  if (meta.skill) {
    try {
      const installs = await skillInstalls(meta.skill);
      if (installs !== null) signals.installs = installs;
    } catch {
      // the skills.sh signal is optional
    }
  }
  const evaluation = evaluate({
    signals,
    contributors,
    official: meta.official,
    stable: meta.stable,
    stable_reason: meta.stable_reason,
  });
  return {
    id,
    found: true,
    full_name: repo.result.full_name,
    renamed: repo.renamed,
    description: repo.result.description,
    topics: repo.result.topics,
    signals,
    contributors,
    evaluation,
  };
}
