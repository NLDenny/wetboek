import { visit } from 'unist-util-visit';

// Astro's built-in heading-id generator (github-slugger) does not collapse
// consecutive separators, so a heading like "Artikel 131 | Opruiing" becomes
// "artikel-131--opruiing" (double hyphen where the pipe was removed). All of
// this site's cross-links were written against the OLD MkDocs/python-markdown
// slug format (which does collapse runs of whitespace/hyphens into one), e.g.
// "artikel-131-opruiing". Rather than rewrite every link, this plugin
// pre-computes MkDocs-compatible ids and sets them before Astro's own
// rehypeHeadingIds runs (which skips headings that already have an id).
const COMBINING_MARKS_RE = /[̀-ͯ]/g;

function mkdocsSlug(text) {
  return text
    // python-markdown's default slugify strips accents via NFKD + ASCII
    // fold (e.g. "Categorieen" <- "Categorieën") before cleaning up.
    .normalize('NFKD')
    .replace(COMBINING_MARKS_RE, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-');
}

export function rehypeMkdocsSlugs() {
  return (tree) => {
    const slugCounts = new Map();
    visit(tree, 'element', (node) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;

      let text = '';
      visit(node, 'text', (child) => {
        text += child.value;
      });
      if (!text) return;

      let slug = mkdocsSlug(text);
      const count = slugCounts.get(slug) ?? 0;
      slugCounts.set(slug, count + 1);
      if (count > 0) slug = `${slug}_${count}`;

      node.properties = node.properties || {};
      node.properties.id = slug;
    });
  };
}
