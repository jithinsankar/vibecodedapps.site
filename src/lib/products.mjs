/**
 * The product canon.
 *
 * `data/products.json` is the curated list of established products that a listing
 * can claim to replace. It is deliberately hand-maintained: it is what keeps the
 * directory organised around questions people actually ask ("is there a vibecoded
 * clone of Photoshop?") instead of an endless pile of tags.
 *
 * Adding a product here creates its page at /clone/<slug>/, including when
 * nothing in the directory replaces it yet, which is the honest answer to give.
 *
 * Plain ESM + fs so it can be shared by Astro, the validator and the scripts.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const catalogue = JSON.parse(readFileSync(join(root, 'data', 'products.json'), 'utf8'));

/** @typedef {{ name: string, slug: string, vendor: string, section: string, homepage: string, summary: string, gap: string, aliases: string[] }} Product */

/** @type {Product[]} */
export const PRODUCTS = catalogue.map((product) => ({
  ...product,
  aliases: product.aliases ?? [],
}));

export const PRODUCTS_BY_SLUG = new Map(PRODUCTS.map((product) => [product.slug, product]));

const byNameExact = new Map(PRODUCTS.map((product) => [product.name, product]));
const byNameFolded = new Map(PRODUCTS.map((product) => [product.name.toLowerCase(), product]));
const byAlias = new Map();
for (const product of PRODUCTS) {
  for (const alias of product.aliases) {
    if (!byAlias.has(alias.toLowerCase())) byAlias.set(alias.toLowerCase(), product);
  }
}

/**
 * Resolve whatever a contributor wrote, such as "Procreate", "procreate" or
 * "ipad drawing", to a canonical product. Returns undefined when nothing fits.
 *
 * @param {string} value
 * @returns {Product | undefined}
 */
export function canonicalProduct(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;

  return (
    byNameExact.get(raw) ??
    PRODUCTS_BY_SLUG.get(raw.toLowerCase()) ??
    byNameFolded.get(raw.toLowerCase()) ??
    byAlias.get(raw.toLowerCase())
  );
}

export function productByName(name) {
  return byNameExact.get(name) ?? byNameFolded.get(String(name).toLowerCase());
}

/** Sections that actually contain products, in catalogue order. */
export const PRODUCT_SECTIONS = [...new Set(PRODUCTS.map((product) => product.section))];

/** How a replacement relationship reads in the UI. */
export const KIND_LABELS = {
  clone: 'Clone',
  alternative: 'Alternative',
  'inspired-by': 'Inspired by',
};
