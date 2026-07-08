import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pageSchema = z.object({
  title: z.string(),
  navLabel: z.string().optional(),
  order: z.number().default(0),
  draft: z.boolean().default(false),
  description: z.string().optional(),
});

const wetgeving = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/wetgeving' }),
  schema: pageSchema,
});

const doj = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/doj' }),
  schema: pageSchema,
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: pageSchema,
});

export const collections = { wetgeving, doj, pages };
