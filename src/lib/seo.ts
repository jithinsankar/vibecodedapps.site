/**
 * schema.org builders.
 *
 * Every page emits one JSON-LD graph, and the shapes live here so a page cannot
 * invent a slightly different BreadcrumbList from its neighbour. Builders return
 * plain objects; `graph()` serialises them into the document the layout writes.
 *
 * Two rules worth keeping:
 *
 * 1. Only assert what the page can actually show. There are no ratings on this
 *    site, so there is no aggregateRating, however much richer search results
 *    would look with one.
 * 2. Nest with `@id` references rather than repeating the organisation in full
 *    on every page. Search engines resolve the graph.
 */
import { SITE } from '../config';

export type JsonLd = Record<string, unknown>;

/** Absolute URL for a site-relative path. */
export function absolute(path: string): string {
  return new URL(path, SITE.url).href;
}

export const ORG_ID = `${SITE.url}/#organization`;
export const SITE_ID = `${SITE.url}/#website`;

/** "@vibecodedapps", derived from the profile URL. */
export function xHandle(): string {
  const handle = SITE.social.x.split('/').filter(Boolean).pop() ?? '';
  return handle ? `@${handle}` : '';
}

/**
 * schema.org wants a *Application category, not a section name. Mapping them
 * keeps the section vocabulary below untouched while giving search engines a
 * value they recognise.
 */
const APPLICATION_CATEGORIES: Record<string, string> = {
  'AI & Agents': 'BusinessApplication',
  'Developer Tools': 'DeveloperApplication',
  Design: 'DesignApplication',
  Media: 'MultimediaApplication',
  Productivity: 'BusinessApplication',
  Marketing: 'BusinessApplication',
  Finance: 'FinanceApplication',
  Health: 'HealthApplication',
  Education: 'EducationalApplication',
  Games: 'GameApplication',
  'Fun & Toys': 'EntertainmentApplication',
  Community: 'SocialNetworkingApplication',
  Utilities: 'UtilitiesApplication',
  'Open Source': 'DeveloperApplication',
};

export function applicationCategoryFor(section: string): string {
  return APPLICATION_CATEGORIES[section] ?? 'WebApplication';
}

/**
 * The publisher. `logo` points at the raster mark scripts/make-og.mjs derives
 * from the favicon: Google's logo guidelines ask for a square raster image, and
 * an SVG favicon will not qualify.
 */
export function organizationLd(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    logo: {
      '@type': 'ImageObject',
      url: absolute('/logo.png'),
      width: 512,
      height: 512,
    },
    sameAs: [SITE.repo, SITE.social.x],
  };
}

export function websiteLd(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    name: SITE.name,
    alternateName: 'Vibecoded apps',
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE.locale,
    publisher: { '@id': ORG_ID },
  };
}

export function breadcrumbLd(trail: Array<{ name: string; path: string }>): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

export function itemListLd(
  name: string,
  items: Array<{ name: string; path: string }>,
  description?: string,
): JsonLd {
  return {
    '@type': 'ItemList',
    name,
    ...(description ? { description } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absolute(item.path),
    })),
  };
}

export function faqLd(entries: Array<{ question: string; answer: string }>): JsonLd {
  return {
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

/**
 * Free, freemium and open-source listings all have a real zero price to state.
 * A paid listing has no price the directory knows, so it asserts no offer at
 * all rather than inventing one.
 */
function offersFor(pricing: string): JsonLd | undefined {
  if (pricing === 'paid') return undefined;

  return {
    '@type': 'Offer',
    price: 0,
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  };
}

interface SoftwareAppInput {
  name: string;
  tagline: string;
  slug: string;
  url: string;
  category: string;
  pricing: string;
  launchedAt: string;
  screenshots?: string[];
  icon?: string;
  repo?: string;
  maker: { name: string; url?: string };
}

export function softwareApplicationLd(app: SoftwareAppInput): JsonLd {
  const listingUrl = absolute(`/apps/${app.slug}/`);
  const image = app.screenshots?.[0] ?? app.icon;
  const offers = offersFor(app.pricing);

  return {
    '@type': 'SoftwareApplication',
    '@id': `${listingUrl}#software`,
    name: app.name,
    description: app.tagline,
    // The app's own homepage, not the listing. The listing is where this is
    // asserted, and `url` should point at the thing being described.
    url: app.url,
    applicationCategory: applicationCategoryFor(app.category),
    operatingSystem: 'Web',
    datePublished: app.launchedAt,
    author: {
      '@type': 'Person',
      name: app.maker.name,
      ...(app.maker.url ? { url: app.maker.url } : {}),
    },
    ...(app.repo ? { codeRepository: app.repo } : {}),
    ...(image ? { image } : {}),
    ...(app.screenshots?.length ? { screenshot: app.screenshots } : {}),
    ...(offers ? { offers } : {}),
    isPartOf: { '@id': SITE_ID },
  };
}

/** Serialise one or more nodes into a single `@graph` document. */
export function graph(...nodes: Array<JsonLd | null | undefined | false>): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  });
}
