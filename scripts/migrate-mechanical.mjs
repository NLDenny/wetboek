#!/usr/bin/env node
// One-off mechanical migration script (MkDocs markdown -> Astro content collection .mdx).
//
// Only touches SYNTAX, never wording:
//   1. Insert missing space after leading `#`s (MkDocs/Python-Markdown tolerates
//      "#####Artikel 1", Astro's strict CommonMark/MDX parser does not).
//   2. Strip decorative <span style="color: #HEX;">...</span> wrappers (the gold
//      article-heading color now comes from global CSS on h5, not inline styles).
//   3. Normalize <br>/<br/> to <br /> (MDX requires self-closed tags).
//   4. Convert raw HTML comments <!-- --> to MDX comments {/* */} (MDX does not
//      reliably parse arbitrary raw HTML comments the way markdown does).
//
// Verification gate per file:
//   - heading count per depth (h1-h6) must be identical before/after.
//   - a "prose-only" diff (all markdown/HTML syntax stripped, whitespace
//     collapsed) must show zero differences, proving no wording changed.
//
// Output goes to .migration-staging/<name>.mdx for manual review (frontmatter,
// links, images, and any grid-cards/step-list conversion still happen by hand
// in the next pass) -- this script never writes directly into src/content/.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const files = [
  'docs/Wetgeving/sr.md',
  'docs/Wetgeving/sv.md',
  'docs/Wetgeving/wwm.md',
  'docs/Wetgeving/wvw.md',
  'docs/Wetgeving/Overig/wgvgk.md',
  'docs/Wetgeving/Overig/wid.md',
  'docs/Wetgeving/Overig/awbi.md',
  'docs/ambts.txt',
  'docs/polw2012.txt',
  'docs/Department of Justice/rechtbank.md',
  'docs/Department of Justice/sanctienormen.md',
];

// (?!#) forces the match to the FULL leading hash-run (prevents the regex
// engine from backtracking to a shorter prefix where the lookahead below
// would incorrectly be satisfied by one of the hashes themselves).
const HEADING_RE = /^(#{1,6})(?!#)(?=\S)/gm;
const SPAN_RE = /<span style="color:\s*#[0-9A-Fa-f]{6};?">(.*?)<\/span>/g;
const BR_RE = /<br\s*\/?>/gi;
const COMMENT_RE = /<!--([\s\S]*?)-->/g;

function countHeadingsByDepth(text) {
  const counts = {};
  for (const line of text.split('\n')) {
    // Matches both "#####Artikel" (unspaced, original) and "##### Artikel"
    // (spaced, post-fix) identically -- a run of 1-6 '#' not followed by
    // another '#', regardless of what comes after.
    const m = /^(#{1,6})(?!#)/.exec(line);
    if (m) counts[m[1].length] = (counts[m[1].length] ?? 0) + 1;
  }
  return counts;
}

function proseOnly(text) {
  return text
    .replace(COMMENT_RE, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ' '))
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`|~-]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function countsEqual(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

mkdirSync(path.join(repoRoot, '.migration-staging'), { recursive: true });

let allOk = true;

for (const rel of files) {
  const srcPath = path.join(repoRoot, rel);
  const original = readFileSync(srcPath, 'utf8');

  // Order matters: fix heading spaces first, strip spans (spans can be
  // glued to the un-spaced heading), then normalize <br>, then comments.
  let out = original.replace(HEADING_RE, '$1 ');
  out = out.replace(SPAN_RE, '$1');
  out = out.replace(BR_RE, '<br />');
  out = out.replace(COMMENT_RE, (_, inner) => `{/*${inner}*/}`);

  const beforeCounts = countHeadingsByDepth(original);
  const afterCounts = countHeadingsByDepth(out);
  const headingsOk = countsEqual(beforeCounts, afterCounts);

  const beforeProse = proseOnly(original);
  const afterProse = proseOnly(out);
  const proseOk = beforeProse === afterProse;

  const baseName = path.basename(rel).replace(/\.(md|txt)$/, '');
  const outPath = path.join(repoRoot, '.migration-staging', `${baseName}.mdx`);
  writeFileSync(outPath, out, 'utf8');

  const status = headingsOk && proseOk ? 'OK' : 'REVIEW NEEDED';
  if (!(headingsOk && proseOk)) allOk = false;
  console.log(`[${status}] ${rel} -> ${path.relative(repoRoot, outPath)}`);
  if (!headingsOk) {
    console.log('  heading counts differ:', beforeCounts, '!=', afterCounts);
  }
  if (!proseOk) {
    console.log('  prose diff detected (first 200 chars of each):');
    console.log('    before:', beforeProse.slice(0, 200));
    console.log('    after: ', afterProse.slice(0, 200));
  }
}

console.log(allOk ? '\nAll files passed verification.' : '\nSome files need manual review before proceeding.');
process.exit(allOk ? 0 : 1);
