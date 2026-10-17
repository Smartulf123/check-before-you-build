// Shared HTTP helper: timeouts, retries with backoff, rate-limit handling, per-run cache.
import { readCache, writeCache } from './cache.mjs';

export const USER_AGENT =
  'check-before-you-build (+https://github.com/Smartulf123/check-before-you-build)';

const MAX_RATE_LIMIT_WAIT_MS = 20_000;

export class HttpError extends Error {
  constructor(message, { status, url, body } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

export class RateLimitError extends HttpError {
  constructor(message, { url, resetAt } = {}) {
    super(message, { status: 429, url });
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// How long to wait before retrying a rate-limited response, or null if unknown.
function rateLimitWaitMs(res) {
  const retryAfter = res.headers.get('retry-after');
  if (retryAfter && !Number.isNaN(Number(retryAfter))) return Number(retryAfter) * 1000;
  const reset = res.headers.get('x-ratelimit-reset');
  if (reset && res.headers.get('x-ratelimit-remaining') === '0') {
    return Math.max(0, Number(reset) * 1000 - Date.now()) + 1000;
  }
  return null;
}

/**
 * Fetch a URL and parse JSON.
 * Returns { status, data }. A 404 resolves with { status: 404, data: null } so callers
 * can treat "not found" as a normal answer. Other failures throw HttpError / RateLimitError.
 */
export async function fetchJson(url, { headers = {}, retries = 2, timeoutMs = 15_000, cache = true } = {}) {
  if (cache) {
    const hit = await readCache(url);
    if (hit) return hit;
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res;
    try {
      res = await globalThis.fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastError = new HttpError(`network error: ${err.message}`, { url });
      if (attempt < retries) await sleep(500 * 2 ** attempt);
      continue;
    }

    if (res.status === 404) {
      const result = { status: 404, data: null };
      if (cache) await writeCache(url, result);
      return result;
    }

    const isRateLimited =
      res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0');
    if (isRateLimited) {
      const waitMs = rateLimitWaitMs(res);
      if (attempt < retries && waitMs !== null && waitMs <= MAX_RATE_LIMIT_WAIT_MS) {
        await sleep(waitMs);
        continue;
      }
      const reset = res.headers.get('x-ratelimit-reset');
      throw new RateLimitError(`rate limited by ${new URL(url).host}`, {
        url,
        resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : null,
      });
    }

    if (res.status >= 500 && attempt < retries) {
      lastError = new HttpError(`server error ${res.status}`, { status: res.status, url });
      await sleep(500 * 2 ** attempt);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new HttpError(`HTTP ${res.status} from ${new URL(url).host}`, {
        status: res.status,
        url,
        body: body.slice(0, 300),
      });
    }

    const data = await res.json();
    const result = { status: res.status, data };
    if (cache) await writeCache(url, result);
    return result;
  }
  throw lastError;
}

/** HEAD-style reachability check used by verification. Falls back to GET when HEAD is refused. */
export async function checkUrl(url, { timeoutMs = 10_000 } = {}) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await globalThis.fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (method === 'HEAD' && (res.status === 405 || res.status === 403)) continue;
      return { url, status: res.status, ok: res.status < 400, finalUrl: res.url };
    } catch (err) {
      if (method === 'GET') return { url, status: 0, ok: false, error: err.message };
    }
  }
  return { url, status: 0, ok: false };
}
