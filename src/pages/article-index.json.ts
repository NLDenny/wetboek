import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { mkdocsSlug } from '../lib/rehype-mkdocs-slugs.mjs';

export const prerender = true;

const EXCERPT_MAX_LENGTH = 220;

function excerptFromContent(content: string): string {
  // Article bodies live inside a fenced code block right after the
  // heading (see src/content/wetgeving/*.mdx) -- grab that, or fall back
  // to the raw content if a heading has no fence for some reason.
  const fenced = content.match(/```[^\n]*\n([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : content;
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  return collapsed.length > EXCERPT_MAX_LENGTH
    ? `${collapsed.slice(0, EXCERPT_MAX_LENGTH - 1).trimEnd()}…`
    : collapsed;
}

export const GET: APIRoute = async () => {
  const entries = await getCollection('wetgeving', ({ data }) => !data.draft);
  const index: Record<string, { title: string; excerpt: string }> = {};

  for (const entry of entries) {
    const body = (entry as unknown as { body?: string }).body ?? '';
    const slugCounts = new Map<string, number>();
    // Splitting on any heading line (## through ######) keeps each
    // Artikel's content correctly bounded by the next heading of any
    // level, matching how the real page headings/anchors are derived.
    const parts = body.split(/^(#{2,6}[ \t]+.+)$/m);

    for (let i = 1; i < parts.length; i += 2) {
      const headingMatch = parts[i].match(/^(#{2,6})[ \t]+(.+)$/);
      if (!headingMatch || headingMatch[1].length !== 5) continue;

      const title = headingMatch[2].trim();
      let slug = mkdocsSlug(title);
      const count = slugCounts.get(slug) ?? 0;
      slugCounts.set(slug, count + 1);
      if (count > 0) slug = `${slug}_${count}`;

      const excerpt = excerptFromContent(parts[i + 1] ?? '');
      if (!excerpt) continue;

      index[`/wetgeving/${entry.id}/#${slug}`] = { title, excerpt };
    }
  }

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
};
