// Read and write catalog category files (catalog/entries/<category>.json).
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CATALOG_DIR = fileURLToPath(new URL('../../skills/check-before-you-build/catalog/', import.meta.url));
export const ENTRIES_DIR = `${CATALOG_DIR}entries/`;

export async function readCategories() {
  return JSON.parse(await readFile(`${CATALOG_DIR}categories.json`, 'utf8'));
}

export async function readCategoryFile(slug) {
  const file = `${ENTRIES_DIR}${slug}.json`;
  if (!existsSync(file)) return { category: slug, entries: [] };
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function writeCategoryFile(slug, data) {
  await mkdir(ENTRIES_DIR, { recursive: true });
  const sorted = { category: slug, entries: [...data.entries].sort((a, b) => a.name.localeCompare(b.name)) };
  await writeFile(`${ENTRIES_DIR}${slug}.json`, JSON.stringify(sorted, null, 2) + '\n');
}

/** All category files as [{ file, data }]. */
export async function readAllCategoryFiles() {
  if (!existsSync(ENTRIES_DIR)) return [];
  const files = (await readdir(ENTRIES_DIR)).filter((f) => f.endsWith('.json'));
  const out = [];
  for (const file of files) out.push({ file, data: JSON.parse(await readFile(ENTRIES_DIR + file, 'utf8')) });
  return out;
}

export const today = () => new Date().toISOString().slice(0, 10);
