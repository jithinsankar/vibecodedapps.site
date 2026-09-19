import type { APIRoute } from 'astro';
import rss from '@astrojs/rss';
import { SITE } from '../config';
import { getApps } from '../lib/apps';

export const GET: APIRoute = async (context) => {
  const apps = await getApps();

  return rss({
    title: `${SITE.name}: newest vibecoded apps`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    trailingSlash: true,
    customData: '<language>en</language>',
    items: apps.slice(0, 50).map((app) => ({
      title: `${app.name}: ${app.tagline}`,
      link: `/apps/${app.slug}/`,
      description: app.tagline,
      pubDate: new Date(`${app.launchedAt}T00:00:00Z`),
      categories: [app.category, ...app.tags],
      author: app.maker.name,
    })),
  });
};
