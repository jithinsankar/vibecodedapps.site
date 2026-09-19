import { getCollection, type CollectionEntry } from 'astro:content';
import { isSponsorshipActive } from './listing-schema.mjs';
import { canonicalProduct, PRODUCTS, type Product } from './products.mjs';

export type AppEntry = CollectionEntry<'apps'>;

/** How a replacement relationship reads in the UI. */
const KIND_LABELS: Record<'clone' | 'alternative' | 'inspired-by', string> = {
  clone: 'Clone',
  alternative: 'Alternative',
  'inspired-by': 'Inspired by',
};

/** A listing's relationship to one product it stands in for. */
export interface Replacement {
  /** Canonical product name, e.g. "Adobe Photoshop". */
  product: string;
  /** URL slug of that product's page, e.g. "adobe-photoshop". */
  slug: string;
  vendor: string;
  section: string;
  kind: 'clone' | 'alternative' | 'inspired-by';
  kindLabel: string;
  note?: string;
  /** Product name, vendor and aliases, lowercased for the client-side search. */
  keywords: string;
}

/** A listing plus the few derived fields the UI needs. */
export type AppView = AppEntry['data'] & {
  /** URL-safe id, taken from the JSON filename. */
  slug: string;
  /** True while a paid placement is running. */
  sponsored: boolean;
  /** Editorial pick. */
  featured: boolean;
  /** Human label for the sponsored badge. */
  sponsorLabel: string | null;
  /** Where the card should link out to. */
  outbound: string;
  /** Fallback monogram when there is no icon. */
  initials: string;
  /** Bare hostname, shown on cards instead of the full URL. */
  host: string;
  /** Resolved replacements, canonicalised against data/products.json. */
  replacements: Replacement[];
  /** "Photoshop" or "Photoshop, Procreate", empty for originals. */
  replacementLabel: string;
  /** True when the listing claims no incumbent. */
  isOriginal: boolean;
};

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .split(/[\s-]+/)
    .filter(Boolean);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
}

/** Deterministic hue per listing, so generated cover art is stable across builds. */
export function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

export function toView(entry: AppEntry, now = new Date()): AppView {
  const data = entry.data;
  const sponsored = isSponsorshipActive(data.sponsor, now);

  const replacements: Replacement[] = data.replaces.map((entry) => {
    const product = canonicalProduct(entry.product)!;
    const kind = (entry.kind ?? 'alternative') as Replacement['kind'];

    return {
      product: product.name,
      slug: product.slug,
      vendor: product.vendor,
      section: product.section,
      kind,
      kindLabel: KIND_LABELS[kind],
      ...(entry.note ? { note: entry.note } : {}),
      keywords: [product.name, product.vendor, ...product.aliases].join(' ').toLowerCase(),
    };
  });

  return {
    ...data,
    slug: entry.id,
    sponsored,
    featured: data.featured && !sponsored,
    sponsorLabel: sponsored ? (data.sponsor!.label ?? 'Sponsored') : null,
    outbound: sponsored && data.sponsor!.url ? data.sponsor!.url : data.url,
    initials: initials(data.name),
    host: hostname(data.url),
    replacements,
    replacementLabel: replacements.map((replacement) => replacement.product).join(', '),
    isOriginal: replacements.length === 0,
  };
}

/** Every listing, newest first, sponsorships already expired filtered out. */
export async function getApps(): Promise<AppView[]> {
  const entries = await getCollection('apps');
  return entries.map((entry) => toView(entry)).sort(byNewest);
}

export function byNewest(a: AppView, b: AppView): number {
  return b.launchedAt.localeCompare(a.launchedAt) || a.name.localeCompare(b.name);
}

export function byPopular(a: AppView, b: AppView): number {
  return (b.stars ?? 0) - (a.stars ?? 0) || byNewest(a, b);
}

export function byName(a: AppView, b: AppView): number {
  return a.name.localeCompare(b.name);
}

export type SortMode = 'newest' | 'popular' | 'az';

export function sortApps(apps: AppView[], mode: SortMode): AppView[] {
  const comparator = mode === 'popular' ? byPopular : mode === 'az' ? byName : byNewest;
  return [...apps].sort(comparator);
}

/**
 * Paid placements, then editorial picks. Kept in their own row so they are never
 * mistaken for organic results.
 */
export function getSpotlight(apps: AppView[]): AppView[] {
  const paid = apps.filter((app) => app.sponsored);
  const picked = apps.filter((app) => app.featured);
  return [...paid, ...picked];
}

/* -------------------------------------------------------------------------- */
/*  The product axis                                                          */
/*                                                                            */
/*  Everything below powers the question the directory is actually built to   */
/*  answer: "is there a vibecoded clone of X?"                                */
/* -------------------------------------------------------------------------- */

/** How strongly a listing claims a product. Clones first, then alternatives. */
const KIND_ORDER: Record<Replacement['kind'], number> = {
  clone: 0,
  alternative: 1,
  'inspired-by': 2,
};

/** A product from the canon, with what the directory has for it. */
export interface ProductView extends Product {
  /** How many listings claim to replace it. Zero is a perfectly good answer. */
  count: number;
  clones: number;
  alternatives: number;
  inspiredBy: number;
  apps: AppView[];
}

export function productsWithCounts(apps: AppView[]): ProductView[] {
  const grouped = new Map<string, AppView[]>();

  for (const app of apps) {
    for (const replacement of app.replacements) {
      const list = grouped.get(replacement.slug) ?? [];
      list.push(app);
      grouped.set(replacement.slug, list);
    }
  }

  return PRODUCTS.map((product) => {
    const list = grouped.get(product.slug) ?? [];
    const sorted = [...list].sort((a, b) => {
      const rank = (app: AppView) =>
        Math.min(
          ...app.replacements
            .filter((replacement) => replacement.slug === product.slug)
            .map((replacement) => KIND_ORDER[replacement.kind]),
        );
      return rank(a) - rank(b) || byNewest(a, b);
    });

    return {
      ...product,
      count: sorted.length,
      clones: sorted.filter((app) =>
        app.replacements.some((r) => r.slug === product.slug && r.kind === 'clone'),
      ).length,
      alternatives: sorted.filter((app) =>
        app.replacements.some((r) => r.slug === product.slug && r.kind === 'alternative'),
      ).length,
      inspiredBy: sorted.filter((app) =>
        app.replacements.some((r) => r.slug === product.slug && r.kind === 'inspired-by'),
      ).length,
      apps: sorted,
    };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Listings that claim no incumbent at all. */
export function originalApps(apps: AppView[]): AppView[] {
  return apps.filter((app) => app.isOriginal);
}

/**
 * The replacement note a listing gives for one product, for the "what it does
 * differently" line on a clone page.
 */
export function noteFor(app: AppView, productSlug: string): string | undefined {
  return app.replacements.find((replacement) => replacement.slug === productSlug)?.note;
}

export function kindFor(app: AppView, productSlug: string): Replacement['kind'] | undefined {
  return app.replacements.find((replacement) => replacement.slug === productSlug)?.kind;
}

export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function categoriesWithCounts(apps: AppView[]): Array<{ name: string; slug: string; count: number }> {
  const counts = new Map<string, number>();
  for (const app of apps) {
    counts.set(app.category, (counts.get(app.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: categorySlug(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function toolsWithCounts(apps: AppView[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const app of apps) {
    for (const tool of app.builtWith) {
      counts.set(tool, (counts.get(tool) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getStats(apps: AppView[]): {
  apps: number;
  categories: number;
  tools: number;
  makers: number;
  incumbents: number;
  covered: number;
} {
  const covered = new Set(apps.flatMap((app) => app.replacements.map((r) => r.slug))).size;

  return {
    apps: apps.length,
    categories: new Set(apps.map((app) => app.category)).size,
    tools: new Set(apps.flatMap((app) => app.builtWith)).size,
    makers: new Set(apps.map((app) => app.maker.handle ?? app.maker.name)).size,
    incumbents: PRODUCTS.length,
    covered,
  };
}

export function formatDate(date: string, locale = 'en-US'): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Related listings: same category first, then shared tools. */
export function relatedApps(app: AppView, apps: AppView[], limit = 3): AppView[] {
  const scored = apps
    .filter((candidate) => candidate.slug !== app.slug)
    .map((candidate) => {
      let score = candidate.category === app.category ? 3 : 0;
      if (candidate.maker.handle && candidate.maker.handle === app.maker.handle) score -= 5;
      score += candidate.builtWith.filter((tool) => app.builtWith.includes(tool)).length;
      score += candidate.tags.filter((tag) => app.tags.includes(tag)).length;
      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byNewest(a.candidate, b.candidate));

  return scored.slice(0, limit).map(({ candidate }) => candidate);
}
