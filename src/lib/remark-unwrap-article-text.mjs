import { visit } from 'unist-util-visit';

// Article text in every wetboek is authored as fenced ``` blocks with the
// prose hard-wrapped at a fixed column width for readability in an editor
// (see e.g. src/content/wetgeving/sr.mdx). Rendered verbatim in a <pre>,
// those mid-sentence line breaks fight with the page's actual (narrower,
// variable) column width, producing orphaned-looking fragments instead of
// natural word-wrap. This plugin joins those incidental wraps back into
// single logical lines before render, using the same signal the source
// already encodes: a soft-wrapped line ends in exactly one trailing space
// (the editor's wrap artifact), while an intentional line end has none, or
// two-or-more (the Markdown hard-break convention used deliberately
// elsewhere, e.g. the abbreviations legend in sanctienormen.mdx).
//
// This has to run as a REMARK plugin (on the mdast `code` node's raw
// `.value`), not a rehype plugin: by the time rehype plugins run, Astro has
// already handed the code block to Shiki, which rewrites it into one
// <span class="line"> per source line -- there's no single text node left
// to edit at that point, and re-splitting Shiki's per-line spans back
// apart would be far more fragile than editing the plain string upstream.
const MARKER_RE = /^(\d+\.|\d+°|[a-zA-Z]\.|-)\s/;

export function unwrapArticleText(text) {
  // Source files use CRLF line endings; strip the \r before measuring
  // trailing spaces, otherwise it masks the real space count (a line
  // ending "...word \r" has 0 trailing [ \t] by a naive $-anchored
  // check, since \r -- not a space -- sits at the true end of string).
  const rawLines = text.split('\n').map((line) => line.replace(/\r$/, ''));
  const output = [];
  let previousEndsWithSoftWrap = false;
  let atLineStart = true;

  for (const rawLine of rawLines) {
    const stripped = rawLine.replace(/[ \t]+$/, '');
    const trailingSpaces = rawLine.length - stripped.length;
    const trimmed = rawLine.trim();

    if (trimmed === '') {
      output.push('');
      previousEndsWithSoftWrap = false;
      atLineStart = true;
      continue;
    }

    // A line starting a new list item (numbered/lettered/degree/dash) is
    // never folded into the previous one, even if that previous line
    // happens to end with a single trailing space -- a complete sentence
    // can still have an accidental trailing space (see Artikel 36e Sr).
    const isMarker = MARKER_RE.test(trimmed);
    const shouldJoin = !atLineStart && previousEndsWithSoftWrap && !isMarker && output.length > 0;

    if (shouldJoin) {
      output[output.length - 1] = `${output[output.length - 1]} ${trimmed}`;
    } else {
      output.push(stripped);
    }

    previousEndsWithSoftWrap = trailingSpaces === 1;
    atLineStart = false;
  }

  return output.join('\n');
}

export function remarkUnwrapArticleText() {
  return (tree) => {
    visit(tree, 'code', (node) => {
      node.value = unwrapArticleText(node.value);
    });
  };
}
