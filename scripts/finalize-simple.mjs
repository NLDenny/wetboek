#!/usr/bin/env node
// Finalizes the "pure law text" staged files (no links/images/grid-cards to
// hand-convert): strips the redundant leading "# Title" line (title now
// comes from frontmatter, rendered by DocLayout) and prepends frontmatter.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');

const entries = [
  { staged: 'wgvgk', dest: 'src/content/wetgeving/overig/wgvgk.mdx', title: 'Wet gedeeltelijk verbod gezichtsbedekkende kleding', order: 8 },
  { staged: 'wid', dest: 'src/content/wetgeving/overig/wid.mdx', title: 'Wet op de identificatieplicht', order: 9 },
  { staged: 'awbi', dest: 'src/content/wetgeving/overig/awbi.mdx', title: 'Algemene wet op het binnentreden', order: 10 },
  { staged: 'wwm', dest: 'src/content/wetgeving/wwm.mdx', title: 'Wet wapens en munitie', order: 4 },
  { staged: 'wvw', dest: 'src/content/wetgeving/wvw.mdx', title: 'Wegenverkeerswet', order: 5 },
  { staged: 'polw2012', dest: 'src/content/wetgeving/polw2012.mdx', title: 'Politiewet 2012', order: 6 },
  { staged: 'ambts', dest: 'src/content/wetgeving/ambts.mdx', title: 'Ambtsinstructie voor de politie en andere opsporingsambtenaren', order: 7 },
];

for (const { staged, dest, title, order } of entries) {
  const srcPath = path.join(repoRoot, '.migration-staging', `${staged}.mdx`);
  let body = readFileSync(srcPath, 'utf8');

  const lines = body.split('\n');
  if (!lines[0].startsWith('# ')) {
    throw new Error(`${staged}: expected leading "# Title" line, got: ${lines[0]}`);
  }
  lines.shift(); // remove "# Title"
  if (lines[0] === '') lines.shift(); // remove the blank line after it
  body = lines.join('\n');

  const frontmatter = `---\ntitle: ${title}\norder: ${order}\n---\n\n`;
  const destPath = path.join(repoRoot, dest);
  writeFileSync(destPath, frontmatter + body, 'utf8');
  console.log(`wrote ${dest}`);
}
