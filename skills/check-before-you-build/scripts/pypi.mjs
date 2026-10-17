#!/usr/bin/env node
// PyPI: package metadata only. PyPI has no search API; discover packages with web search
// (site:pypi.org <keywords>) or via GitHub, then look them up here.
import { fetchJson } from './lib/http.mjs';
import { isMain, runCli } from './lib/cli.mjs';
import { githubFromRepoUrl } from './npm.mjs';

const USAGE = `pypi.mjs <command>
  info <package>   version, license, project URLs; found:false if missing`;

export function pickLicense(info) {
  if (info.license_expression) return info.license_expression;
  if (info.license && info.license.length <= 40) return info.license;
  const classifier = (info.classifiers || []).find((c) => c.startsWith('License :: OSI Approved :: '));
  return classifier ? classifier.split(' :: ').pop() : null;
}

export function mapInfo(info) {
  const urls = Object.values(info.project_urls || {});
  const github = urls.map(githubFromRepoUrl).find(Boolean) || githubFromRepoUrl(info.home_page);
  return {
    id: `pypi:${info.name}`,
    name: info.name,
    url: `https://pypi.org/project/${info.name}/`,
    source: 'pypi',
    description: info.summary || '',
    github,
    signals: { version: info.version, license: pickLicense(info) },
  };
}

export async function packageInfo(name) {
  if (!name) throw new Error('info needs a package name');
  const { status, data } = await fetchJson(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
  if (status === 404) return { source: 'pypi', found: false, id: `pypi:${name}` };
  return { source: 'pypi', found: true, result: mapInfo(data.info) };
}

if (isMain(import.meta.url)) {
  runCli({ info: ([name]) => packageInfo(name) }, USAGE);
}
