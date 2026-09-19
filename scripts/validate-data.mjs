/**
 * Validates every listing in data/apps/.
 *
 * This is exactly what CI runs on a pull request. It uses the same schema the
 * site renders with, so anything that passes here will build.
 *
 *   node scripts/validate-data.mjs            # schema + house rules
 *   node scripts/validate-data.mjs --links    # also checks that URLs respond
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listingSchema, isSlug } from '../src/lib/listing-schema.mjs';
import { canonicalProduct, PRODUCTS } from '../src/lib/products.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appsDir = join(root, 'data', 'apps');
const checkLinks = process.argv.includes('--links');

const errors = [];
const warnings = [];
const seenNames = new Map();
const seenUrls = new Map();
const listings = [];

const files = (await readdir(appsDir)).filter((file) => file.endsWith('.json'));

for (const file of files.sort()) {
  const slug = file.replace(/\.json$/, '');
  const path = `data/apps/${file}`;
  let raw;

  try {
    raw = JSON.parse(await readFile(join(appsDir, file), 'utf8'));
  } catch (error) {
    errors.push(`${path}: not valid JSON, ${error.message}`);
    continue;
  }

  if (!isSlug(slug)) {
    errors.push(
      `${path}: filename must be a URL slug (lowercase letters, numbers, hyphens, max 48 chars)`,
    );
  }

  const result = listingSchema.safeParse(raw);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const where = issue.path.join('.') || '(root)';
      errors.push(`${path}: ${where}, ${issue.message}`);
    }
    continue;
  }

  const listing = result.data;
  listings.push({ slug, listing });

  // Non-canonical product names still resolve, but the stored value should match
  // the catalogue so clone pages and counts stay predictable.
  for (const replacement of listing.replaces ?? []) {
    const canonical = canonicalProduct(replacement.product);
    if (canonical && canonical.name !== replacement.product) {
      warnings.push(
        `${path}: replaces "${replacement.product}", the canonical name is "${canonical.name}"`,
      );
    }
  }

  if (listing.pricing === 'open-source' && !listing.repo) {
    errors.push(`${path}: pricing is "open-source" but there is no repo URL`);
  }

  if (listing.url.includes('example.com')) {
    warnings.push(`${path}: url still points at example.com (seed data?)`);
  }

  if (listing.sponsor && new Date(`${listing.sponsor.until}T23:59:59Z`) < new Date()) {
    warnings.push(
      `${path}: sponsorship expired on ${listing.sponsor.until}, remove the sponsor block or renew it`,
    );
  }

  if (new Date(`${listing.launchedAt}T00:00:00Z`) > new Date()) {
    errors.push(`${path}: launchedAt is in the future`);
  }

  const nameKey = listing.name.toLowerCase();
  if (seenNames.has(nameKey)) {
    warnings.push(`${path}: "${listing.name}" is also listed in ${seenNames.get(nameKey)}`);
  } else {
    seenNames.set(nameKey, path);
  }

  const urlKey = listing.url.replace(/\/$/, '').toLowerCase();
  if (seenUrls.has(urlKey)) {
    warnings.push(`${path}: duplicate url, also used by ${seenUrls.get(urlKey)}`);
  } else {
    seenUrls.set(urlKey, path);
  }
}

if (checkLinks) {
  console.log(`Checking ${listings.length} links (this can take a while)…`);
  await Promise.all(
    listings.map(async ({ slug, listing }) => {
      const targets = [listing.url, listing.repo].filter(Boolean);
      for (const target of targets) {
        try {
          const response = await fetch(target, {
            method: 'GET',
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
            headers: { 'User-Agent': 'vibecoded-directory-linkcheck' },
          });
          if (response.status >= 400) {
            errors.push(`data/apps/${slug}.json: ${target} responded ${response.status}`);
          }
        } catch (error) {
          errors.push(`data/apps/${slug}.json: ${target} unreachable (${error.message})`);
        }
      }
    }),
  );
}

console.log(`${files.length} listing(s) checked`);
for (const warning of warnings) console.warn(`warning: ${warning}`);

// Coverage of the product catalogue is the health metric that matters: it is
// the question the directory exists to answer.
const covered = new Set();
for (const { listing } of listings) {
  for (const replacement of listing.replaces ?? []) {
    const canonical = canonicalProduct(replacement.product);
    if (canonical) covered.add(canonical.slug);
  }
}

const originals = listings.filter(({ listing }) => (listing.replaces ?? []).length === 0);
console.log(
  `coverage: ${covered.size} of ${PRODUCTS.length} catalogue products have a replacement ` +
    `(${originals.length} listing(s) filed as originals)`,
);

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log('All listings are valid.');
