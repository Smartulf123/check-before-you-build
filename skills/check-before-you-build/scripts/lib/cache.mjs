// Per-run response cache so one check never asks a source the same question twice.
// Location: $CBYB_CACHE_DIR, else ./check-reports/.cache. Disable with CBYB_NO_CACHE=1.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const TTL_MS = 60 * 60 * 1000;

function cacheDir() {
  return resolve(process.env.CBYB_CACHE_DIR || join(process.cwd(), 'check-reports', '.cache'));
}

function enabled() {
  return process.env.CBYB_NO_CACHE !== '1';
}

function keyFor(url) {
  return createHash('sha1').update(url).digest('hex') + '.json';
}

export async function readCache(url) {
  if (!enabled()) return null;
  try {
    const entry = JSON.parse(await readFile(join(cacheDir(), keyFor(url)), 'utf8'));
    if (Date.now() - entry.savedAt > TTL_MS) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export async function writeCache(url, value) {
  if (!enabled()) return;
  try {
    await mkdir(cacheDir(), { recursive: true });
    await writeFile(join(cacheDir(), keyFor(url)), JSON.stringify({ savedAt: Date.now(), url, value }));
  } catch {
    // A failed cache write must never break a check.
  }
}
