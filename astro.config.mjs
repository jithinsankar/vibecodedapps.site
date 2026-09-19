// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The canonical URL of the deployed site. Used for canonical tags, sitemap and RSS.
export const SITE_URL = 'https://vibecodedapps.site';

export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({
      // The 404 page carries a noindex directive, so it must not be advertised.
      filter: (page) => !/\/404\/?$/.test(page),
      /*
       * `changefreq` and `priority` are deliberately not set: Google has said it
       * ignores both, so they would be noise in every URL entry. `lastmod` is
       * kept, and is the build time, because this site is fully regenerated from
       * git on every deploy and the build clock is therefore an upper bound on
       * when any page's content last changed.
       */
      lastmod: new Date(),
    }),
  ],
  build: {
    // Inline small stylesheets so the first paint needs one request.
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
