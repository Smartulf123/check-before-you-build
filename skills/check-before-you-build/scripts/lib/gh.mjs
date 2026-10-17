// GitHub token discovery. The token stays in memory: it is never written to disk or printed.
// Order: GITHUB_TOKEN / GH_TOKEN env vars, then `gh auth token`. Disable gh lookup with CBYB_NO_GH=1.
import { spawnSync } from 'node:child_process';

let cached;

export function githubToken() {
  if (cached !== undefined) return cached;
  cached = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  if (!cached && process.env.CBYB_NO_GH !== '1') {
    try {
      const out = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8', timeout: 5000 });
      if (out.status === 0 && out.stdout.trim()) cached = out.stdout.trim();
    } catch {
      // gh not installed: fall back to unauthenticated requests.
    }
  }
  return cached;
}

export function githubHeaders() {
  const token = githubToken();
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function isAuthenticated() {
  return Boolean(githubToken());
}
