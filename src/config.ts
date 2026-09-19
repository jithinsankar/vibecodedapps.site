/**
 * Site-wide configuration.
 *
 * Everything here is meant to be edited by a human. Monetisation is off by
 * default so the directory ships clean, ad-free and open source.
 */

export const SITE = {
  name: 'Vibecoded',
  domain: 'vibecodedapps.site',
  url: 'https://vibecodedapps.site',
  title: 'Vibecoded: is there a vibecoded clone of it?',
  description:
    'An open-source directory of apps built with AI coding tools, organised by the product each one replaces. Every answer has a page.',
  locale: 'en',
  /** Open Graph wants language_TERRITORY, which is not what `locale` is for. */
  ogLocale: 'en_US',

  /**
   * The GitHub repo that holds this site *and* its listings.
   * Change this to your own org/repo. Submit links are generated from it.
   */
  repo: 'https://github.com/vibecoded-apps/directory',

  email: 'hello@vibecodedapps.site',

  social: {
    x: 'https://x.com/vibecodedapps',
    rss: '/rss.xml',
  },
} as const;

/**
 * Ad slots. Disabled by default: nothing is rendered and nothing is loaded.
 *
 * When you are ready to turn ads on, flip `enabled` and drop your provider
 * snippet into `src/components/AdSlot.astro`. Each slot already reserves its
 * height, so switching ads on will not cause layout shift (CLS) or a redesign.
 */
export const ADS = {
  enabled: false,
  provider: null as null | 'adsense' | 'ethicalads' | 'carbon' | 'direct',
  /** Optional publisher/placement ids, read by the AdSlot component. */
  client: '',
  slots: {
    homeInline: '',
    listInline: '',
    detailAside: '',
    footer: '',
  },
} as const;

/**
 * Paid listings. Same idea: the schema and the UI are ready, the switch is off.
 *
 * Sponsorships are stored in the listing itself (`sponsor.until`) and always
 * expire on their own. Sponsored cards are labelled, sorted into their own row
 * and never disguised as editorial picks.
 */
export const SPONSORSHIP = {
  enabled: false,
  /** Shown on /sponsor when enabled. */
  tiers: [
    {
      name: 'Featured',
      price: '$49',
      cadence: 'one month',
      perks: [
        'Highlighted card in the directory',
        'Top placement on your category page',
        'Clearly labelled "Sponsored"',
      ],
    },
    {
      name: 'Gold',
      price: '$199',
      cadence: 'three months',
      perks: [
        'Everything in Featured',
        'Homepage spotlight block',
        'Logo in the newsletter footer',
      ],
      highlighted: true,
    },
    {
      name: 'Partner',
      price: 'Let’s talk',
      cadence: 'custom',
      perks: [
        'Everything in Gold',
        'Sponsored category takeover',
        'Co-authored launch write-up',
      ],
    },
  ],
} as const;

/** How many listings to show before the "Load more" button. */
export const PAGE_SIZE = 12;
