import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { listingSchema } from './lib/listing-schema.mjs';

/**
 * One JSON file per app, in `data/apps/`. Add a file, open a pull request,
 * done: no database, no admin panel, full history in git.
 */
const apps = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './data/apps' }),
  schema: listingSchema,
});

export const collections = { apps };
