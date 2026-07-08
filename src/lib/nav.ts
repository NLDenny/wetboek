import { getCollection } from 'astro:content';

export interface NavLink {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

export interface NavTree {
  top: NavLink[];
  groups: NavGroup[];
}

// Nav is derived from the content collections (title/navLabel/order/draft)
// rather than hand-maintained separately -- a page that exists always shows
// up in the nav unless explicitly marked draft: true. This is what let 4
// pages go silently "dead" in the old mkdocs.yml nav list during the
// original site's history.
export async function buildNavTree(): Promise<NavTree> {
  const [wetgeving, doj, pages] = await Promise.all([
    getCollection('wetgeving', ({ data }) => !data.draft),
    getCollection('doj', ({ data }) => !data.draft),
    getCollection('pages', ({ data }) => !data.draft),
  ]);

  const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

  const top: NavLink[] = pages
    .filter((entry) => entry.id !== 'home')
    .sort(byOrder)
    .map((entry) => ({
      href: `/${entry.id}/`,
      label: entry.data.navLabel ?? entry.data.title,
    }));

  const dojGroup: NavGroup = {
    label: 'Department of Justice',
    items: doj.sort(byOrder).map((entry) => ({
      href: `/department-of-justice/${entry.id}/`,
      label: entry.data.navLabel ?? entry.data.title,
    })),
  };

  const wetgevingGroup: NavGroup = {
    label: 'Wetgeving',
    items: wetgeving
      .filter((entry) => !entry.id.startsWith('overig/'))
      .sort(byOrder)
      .map((entry) => ({
        href: `/wetgeving/${entry.id}/`,
        label: entry.data.navLabel ?? entry.data.title,
      })),
  };

  const overigGroup: NavGroup = {
    label: 'Overig',
    items: wetgeving
      .filter((entry) => entry.id.startsWith('overig/'))
      .sort(byOrder)
      .map((entry) => ({
        href: `/wetgeving/${entry.id}/`,
        label: entry.data.navLabel ?? entry.data.title,
      })),
  };

  return { top, groups: [dojGroup, wetgevingGroup, overigGroup] };
}
