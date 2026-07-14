// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { rehypeMkdocsSlugs } from './src/lib/rehype-mkdocs-slugs.mjs';
import { remarkUnwrapArticleText } from './src/lib/remark-unwrap-article-text.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://wetboek-roxwoodcounty.nl',
  trailingSlash: 'always',
  integrations: [
    mdx({
      remarkPlugins: [remarkUnwrapArticleText],
      rehypePlugins: [rehypeMkdocsSlugs]
    }),
    sitemap()
  ],
  markdown: {
    remarkPlugins: [remarkUnwrapArticleText],
    rehypePlugins: [rehypeMkdocsSlugs]
  }
});