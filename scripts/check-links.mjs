#!/usr/bin/env node
// Verifies every internal href="/...#..." link in the built site resolves
// to a real page and (if it has a #fragment) a real id on that page.

import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const distDir = path.join(repoRoot, 'dist');

const htmlFiles = globSync('**/*.html', { cwd: distDir });
const idCache = new Map();

function getIds(pagePath) {
  if (idCache.has(pagePath)) return idCache.get(pagePath);
  const filePath = path.join(distDir, pagePath, 'index.html');
  if (!existsSync(filePath)) {
    idCache.set(pagePath, null);
    return null;
  }
  const html = readFileSync(filePath, 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  idCache.set(pagePath, ids);
  return ids;
}

let errorCount = 0;
let checkedCount = 0;

for (const file of htmlFiles) {
  const html = readFileSync(path.join(distDir, file), 'utf8');
  const links = [...html.matchAll(/href="(\/[^"#]*)(#[^"]+)?"/g)];
  for (const [, hrefPath, hash] of links) {
    // Skip static assets (favicon, hashed css/js bundles, etc.) -- only
    // check routes, which always end in "/" (trailingSlash: 'always').
    if (/\.[a-z0-9]+$/i.test(hrefPath)) continue;
    checkedCount++;
    const normalized = hrefPath.replace(/\/$/, '') || '/';
    const pagePath = normalized === '/' ? '' : normalized.slice(1);
    const ids = getIds(pagePath);
    if (ids === null) {
      console.log(`[BROKEN PAGE] ${file}: ${hrefPath}${hash ?? ''}`);
      errorCount++;
      continue;
    }
    if (hash && !ids.has(hash.slice(1))) {
      console.log(`[BROKEN ANCHOR] ${file}: ${hrefPath}${hash} (page exists, id not found)`);
      errorCount++;
    }
  }
}

console.log(`\nChecked ${checkedCount} internal links across ${htmlFiles.length} pages.`);
console.log(errorCount === 0 ? 'All internal links resolve.' : `${errorCount} broken link(s) found.`);
process.exit(errorCount === 0 ? 0 : 1);
