/**
 * Refreshes the cached GitHub star counts for every listing that has a repo.
 *
 *   node scripts/refresh-stars.mjs
 *
 * Runs on a schedule from .github/workflows/refresh-stars.yml and commits the
 * result, so the site itself never needs a runtime API call.
 * Set GITHUB_TOKEN to avoid the unauthenticated rate limit.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appsDir = join(root, 'data', 'apps');
const token = process.env.GITHUB_TOKEN ?? '';

const files = (await readdir(appsDir)).filter((file) => file.endsWith('.json'));
let updated = 0;
let checked = 0;

for (const file of files) {
  const path = join(appsDir, file);
  const source = await readFile(path, 'utf8');
  const listing = JSON.parse(source);

  const match = /^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i.exec(listing.repo ?? '');
  if (!match) continue;

  const [, owner, repo] = match;
  const slug = repo.replace(/\.git$/, '');
  checked += 1;

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${slug}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vibecoded-directory',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`skip ${owner}/${slug}: HTTP ${response.status}`);
      continue;
    }

    const { stargazers_count: stars, archived } = await response.json();
    if (typeof stars !== 'number') continue;

    const next = { ...listing };
    if (next.stars !== stars) next.stars = stars;
    if (archived === true && next.status !== 'archived') next.status = 'archived';

    const output = `${JSON.stringify(next, null, 2)}\n`;
    if (output !== source) {
      await writeFile(path, output, 'utf8');
      updated += 1;
      console.log(`updated ${owner}/${slug}: ${stars} stars`);
    }
  } catch (error) {
    console.warn(`skip ${owner}/${slug}: ${error.message}`);
  }

  // Be polite to the API.
  await new Promise((resolve) => setTimeout(resolve, 250));
}

console.log(`${checked} repos checked, ${updated} listing(s) updated`);
