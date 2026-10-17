import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('required folders from SPEC §12 exist', () => {
  for (const dir of [
    'docs',
    'skills/check-before-you-build/references',
    'skills/check-before-you-build/scripts/lib',
    'catalog/entries',
    'scripts',
    'evals',
    'tests/fixtures',
  ]) {
    assert.ok(existsSync(join(root, dir)), `missing folder: ${dir}`);
  }
});

test('package.json declares ESM and no dependencies', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});
