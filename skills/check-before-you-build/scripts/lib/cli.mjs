// Tiny CLI helpers shared by every script: argument parsing and the JSON output contract.
// Contract: stdout gets exactly one JSON object. Success → { ok: true, ... }, exit 0.
// Failure → { ok: false, error: { type, message, ... } }, exit 1.
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Parse argv into { _: [positionals], flags: { name: value|true } }. */
export function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [name, inline] = arg.slice(2).split('=', 2);
      if (inline !== undefined) out.flags[name] = inline;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) out.flags[name] = argv[++i];
      else out.flags[name] = true;
    } else {
      out._.push(arg);
    }
  }
  return out;
}

export function intFlag(flags, name, fallback) {
  const value = Number.parseInt(flags[name], 10);
  return Number.isFinite(value) ? value : fallback;
}

export function errorObject(err) {
  return {
    type: err?.name || 'Error',
    message: err?.message || String(err),
    ...(err?.status ? { status: err.status } : {}),
    ...(err?.resetAt ? { resetAt: err.resetAt } : {}),
  };
}

/** True when the module at `metaUrl` is the script being executed directly. */
/**
 * True when this module is the script being run. Both sides are resolved through realpath:
 * installed skills are often a symlink or junction (~/.claude/skills/<name> → the repo), and Node
 * reports the real path in import.meta.url but the link path in process.argv[1].
 */
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  const real = (p) => {
    try {
      return realpathSync(p);
    } catch {
      return resolve(p);
    }
  };
  return real(fileURLToPath(metaUrl)).toLowerCase() === real(process.argv[1]).toLowerCase();
}

/** Run a command handler and print the JSON result. */
export async function runCli(handlers, usage) {
  const args = parseArgs(process.argv.slice(2));
  const [command, ...rest] = args._;
  if (!command || args.flags.help || !handlers[command]) {
    process.stdout.write(JSON.stringify({ ok: false, error: { type: 'Usage', message: usage } }) + '\n');
    process.exitCode = 1;
    return;
  }
  try {
    const result = await handlers[command](rest, args.flags);
    process.stdout.write(JSON.stringify({ ok: true, ...result }) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: errorObject(err) }) + '\n');
    process.exitCode = 1;
  }
}
