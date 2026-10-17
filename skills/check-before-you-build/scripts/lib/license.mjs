// License classes from SPEC §6.5.1, and which recommendation types each class allows.

const PERMISSIVE = new Set([
  'MIT', 'MIT-0', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD',
  'Unlicense', 'MPL-2.0', 'Zlib', 'BSL-1.0', 'CC0-1.0', 'Python-2.0', 'PSF-2.0',
]);

const COPYLEFT_PREFIXES = ['GPL-', 'AGPL-', 'LGPL-', 'EUPL-', 'OSL-', 'CDDL-', 'EPL-'];

/** Map an SPDX id (or free-text license string) to permissive | copyleft | none | other. */
export function licenseClass(spdx) {
  if (!spdx || spdx === 'NONE' || spdx === 'NOASSERTION') return spdx === 'NOASSERTION' ? 'other' : 'none';
  const id = String(spdx).trim();
  if (PERMISSIVE.has(id)) return 'permissive';
  if (COPYLEFT_PREFIXES.some((p) => id.toUpperCase().startsWith(p))) return 'copyleft';
  const upper = id.toUpperCase();
  if (upper === 'MIT LICENSE' || upper.startsWith('BSD') || upper.startsWith('APACHE')) return 'permissive';
  if (upper.includes('GPL')) return 'copyleft';
  return 'other';
}

const ALLOWED = {
  permissive: ['use', 'fork', 'learn', 'contribute'],
  copyleft: ['use', 'learn', 'contribute', 'fork'],
  none: ['learn'],
  other: ['learn'],
};

export function allowedRecommendations(cls) {
  return ALLOWED[cls] || ['learn'];
}

/** Copyleft forks are allowed only with an explicit warning; none/other only allow learn. */
export function recommendationWarning(cls, type) {
  if (cls === 'copyleft' && (type === 'fork' || type === 'use')) {
    return 'Copyleft license: derived work must use a compatible license.';
  }
  if (cls === 'none' && type !== 'learn') return 'No license: you have no right to copy this code.';
  if (cls === 'other' && type !== 'learn') return 'Custom license: read it before reusing any code.';
  return null;
}
