/**
 * Scaffolds a new listing from data/listing.template.json.
 *
 *   npm run new my-app
 *   npm run new "My App"      # the name is slugified for the filename
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appsDir = join(root, 'data', 'apps');
const templatePath = join(root, 'data', 'listing.template.json');

const input = process.argv.slice(2).join(' ').trim();

if (!input) {
  console.error('Usage: npm run new <app-name>');
  process.exit(1);
}

const slug = input
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 48);

if (!slug) {
  console.error(`"${input}" does not contain any usable characters.`);
  process.exit(1);
}

const target = join(appsDir, `${slug}.json`);

try {
  await access(target);
  console.error(`data/apps/${slug}.json already exists, pick another name.`);
  process.exit(1);
} catch {
  /* does not exist, good */
}

const template = JSON.parse(await readFile(templatePath, 'utf8'));
const listing = {
  ...template,
  name: input.replace(/\b\w/g, (char) => char.toUpperCase()),
  tagline: '',
  url: '',
  launchedAt: new Date().toISOString().slice(0, 10),
  maker: { name: '', handle: '' },
  builtWith: [],
  tags: [],
  stack: [],
};

delete listing.icon;
delete listing.repo;
delete listing.screenshots;
delete listing.stars;

// Start empty rather than inheriting the template's example: claiming the wrong
// incumbent is worse than claiming none.
listing.replaces = [];

await writeFile(target, `${JSON.stringify(listing, null, 2)}\n`, 'utf8');

console.log(`Created data/apps/${slug}.json`);
console.log('Fill it in, starting with "replaces". Pick a product from data/products.json.');
console.log('Then run `npm run validate` before opening a pull request.');
