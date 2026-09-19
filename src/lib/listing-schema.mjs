/**
 * The single source of truth for a directory listing.
 *
 * This file is intentionally plain ESM (no TypeScript, no Astro imports) so that
 * it can be shared by:
 *   1. the Astro content collection  ->  src/content.config.ts
 *   2. the standalone validator      ->  scripts/validate-data.mjs
 *   3. the scaffolding CLI           ->  scripts/new-app.mjs
 *
 * Keeping one schema in one place is what makes the "data lives in git" model
 * safe: a pull request can never merge a listing that the site cannot render.
 */
import { z } from 'zod';
import { canonicalProduct } from './products.mjs';

/** Every category must exist here so listings stay tidy and URLs stay stable. */
export const CATEGORIES = [
  'AI & Agents',
  'Developer Tools',
  'Design',
  'Media',
  'Productivity',
  'Marketing',
  'Finance',
  'Health',
  'Education',
  'Games',
  'Fun & Toys',
  'Community',
  'Utilities',
  'Open Source',
];

/** The tools people actually vibecode with. Free-form strings are allowed too. */
export const VIBE_TOOLS = [
  'Claude Code',
  'Cursor',
  'GitHub Copilot',
  'Windsurf',
  'Codex',
  'Devin',
  'v0',
  'Lovable',
  'Bolt',
  'Replit Agent',
  'Base44',
  'Firebase Studio',
  'Aider',
  'Cline',
];

export const STATUSES = ['live', 'beta', 'wip', 'archived'];
export const PRICING = ['free', 'freemium', 'paid', 'open-source'];
export const SPONSOR_TIERS = ['featured', 'gold', 'partner'];

/**
 * How a listing relates to the product it replaces.
 * `clone` is a deliberate 1:1 rebuild, `alternative` does the same job another
 * way, `inspired-by` borrows the idea without claiming to replace it.
 */
export const REPLACEMENT_KINDS = ['clone', 'alternative', 'inspired-by'];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the ISO format YYYY-MM-DD');

/** Only http(s) links are allowed: no javascript:, data: or relative surprises. */
const link = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), {
    message: 'Links must start with http:// or https://',
  });

export const listingSchema = z.object({
  /** Display name of the app. */
  name: z.string().min(2).max(60),

  /** One sentence, sentence case, no trailing period. Shown on cards. */
  tagline: z.string().min(10).max(120),

  /** A few short paragraphs separated by blank lines. Plain text. */
  description: z.string().max(2000).optional(),

  /** Where people can use the app. */
  url: link,

  /** Public source code, if any. Required when pricing is "open-source". */
  repo: link.optional(),

  /** Square icon, ideally 128x128 or larger. Falls back to a monogram tile. */
  icon: z.string().url().optional(),

  /** Up to 4 screenshot / product images. */
  screenshots: z.array(z.string().url()).max(4).optional(),

  category: z.enum(CATEGORIES),

  /**
   * What this app stands in for. This is the directory's primary axis: it is
   * what turns a pile of listings into an answer to "is there a vibecoded clone
   * of X?". The product must exist in data/products.json, which is what keeps
   * the vocabulary from dissolving into free-text tags.
   *
   * An empty array is allowed and means "original, no obvious incumbent".
   */
  replaces: z
    .array(
      z.object({
        product: z
          .string()
          .min(2)
          .max(60)
          .refine((value) => Boolean(canonicalProduct(value)), {
            message:
              'Unknown product. Add it to data/products.json first, or use a name or alias that already exists there.',
          }),
        kind: z.enum(REPLACEMENT_KINDS).default('alternative'),
        note: z.string().max(160).optional(),
      }),
    )
    .max(3)
    .default([]),

  /** Lowercase, hyphenated. Max 5 so cards stay scannable. */
  tags: z
    .array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/))
    .max(5)
    .default([]),

  /** Which AI tools the app was vibecoded with. */
  builtWith: z.array(z.string().min(1).max(32)).min(1).max(6),

  /** Shipped stack, for the "how was it built" section. */
  stack: z.array(z.string().min(1).max(32)).max(10).default([]),

  maker: z.object({
    name: z.string().min(1).max(60),
    handle: z.string().max(40).optional(),
    url: link.optional(),
    avatar: z.string().url().optional(),
  }),

  status: z.enum(STATUSES).default('live'),
  pricing: z.enum(PRICING).default('free'),

  /** When the app went public. Used for the "Newest" sort and the RSS feed. */
  launchedAt: isoDate,

  /** Optional cached GitHub stars. Refreshed by a scheduled workflow. */
  stars: z.number().int().nonnegative().optional(),

  /** Editorially featured (free). Never mixed up with paid placement. */
  featured: z.boolean().default(false),

  /**
   * Paid placement. Requires `until` (YYYY-MM-DD) so sponsorship always expires
   * on its own, so no stale "sponsored" badge if nobody renews.
   */
  sponsor: z
    .object({
      tier: z.enum(SPONSOR_TIERS),
      until: isoDate,
      /** Where the paid listing should send visitors, if not the app itself. */
      url: link.optional(),
      label: z.string().max(40).optional(),
    })
    .optional(),

  /** Marks seed/demo data so it is visually flagged and easy to strip out. */
  placeholder: z.boolean().default(false),
});

/** @typedef {z.infer<typeof listingSchema>} Listing */

/** Slug rule shared by filenames, URLs and the CLI. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isSlug = (value) => SLUG_PATTERN.test(value) && value.length <= 48;

/** True while a sponsorship is still running (inclusive of the end date). */
export function isSponsorshipActive(sponsor, now = new Date()) {
  if (!sponsor) return false;
  const until = new Date(`${sponsor.until}T23:59:59Z`);
  if (Number.isNaN(until.getTime())) return false;
  if (until.getTime() < now.getTime()) return false;
  // Never show a listing as sponsored before it is actually sponsored.
  return sponsor.until >= '2020-01-01';
}
