/**
 * Shopify CMS page and policy bodies are authored as rich text, but in practice
 * they arrive as one flat run of <p> tags: section titles are plain paragraphs
 * ("SHIPPING"), bullet points are dash-prefixed paragraphs ("- Customers may ..."),
 * and the first line very often just repeats the page title.
 *
 * Oxygen has no DOM, so this is a small, forgiving string pass that turns that
 * body into typed blocks we can actually style. It never throws — anything it
 * doesn't recognise is passed through untouched as an `html` block.
 */

export type RichTextBlock =
  | {type: 'heading'; level: 2 | 3; id: string; html: string; text: string}
  | {type: 'lead'; html: string}
  | {type: 'paragraph'; html: string}
  | {type: 'list'; ordered: boolean; items: string[]}
  | {type: 'html'; html: string};

export type RichTextSection = {id: string; text: string};

export type RichTextDocument = {blocks: RichTextBlock[]; sections: RichTextSection[]};

/** Top-level block elements we pull out of the body. Backreference closes each. */
const BLOCK_PATTERN =
  /<(p|h[1-6]|ul|ol|blockquote|pre|table|figure)\b[^>]*>([\s\S]*?)<\/\1\s*>|<hr\b[^>]*\/?>/gi;

/** List items, matched up to the next <li> so nested lists stay with their parent. */
const LIST_ITEM_PATTERN = /<li\b[^>]*>([\s\S]*?)(?=<li\b|<\/(?:ul|ol)\s*>|$)/gi;

/** A paragraph that is really a bullet point: "- ", "• ", "– " etc. */
const BULLET_PREFIX = /^\s*[-–—•*·▪◦●○]\s+/;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

type Token =
  | {kind: 'text'; html: string}
  | {kind: 'heading'; level: 2 | 3; html: string}
  | {kind: 'list'; ordered: boolean; items: string[]}
  | {kind: 'html'; html: string};

function decodeEntities(value: string): string {
  return value.replace(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.charAt(0) === '#') {
      const code =
        entity.charAt(1) === 'x' || entity.charAt(1) === 'X'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Readable text for a chunk of HTML — used for classification and labels. */
function toPlainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Comparable form, so "Terms & Conditions" and "TERMS AND CONDITIONS" match. */
function toComparable(html: string): string {
  return toPlainText(html)
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

/**
 * Section titles in CMS bodies are short, unpunctuated and either shouted or
 * end in a colon. A full sentence ("We offer returns ... conditions:") is not.
 */
function looksLikeHeading(text: string): boolean {
  if (!text || text.length > 70) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 8) return false;
  if (/[.!?]$/.test(text)) return false;
  if (isAllCaps(text)) return true;
  return /[:–—-]$/.test(text) && words.length <= 5;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

function uniqueId(base: string, seen: Map<string, number>): string {
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

/** Remove a leading dash/bullet, skipping over any inline tags before it. */
function stripBullet(html: string): string {
  // Only the marker itself is removed, and only from the first text node, so a
  // hyphen inside an href or an attribute is never touched.
  const leadingTags = html.match(/^\s*(?:<[^>]*>\s*)*/)?.[0] ?? '';
  const rest = html.slice(leadingTags.length);
  return leadingTags + rest.replace(/^([-–—•*·▪◦●○](?:\s|&nbsp;)*)+/, '');
}

function extractListItems(inner: string): string[] {
  const items: string[] = [];
  LIST_ITEM_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LIST_ITEM_PATTERN.exec(inner))) {
    const html = match[1].trim();
    if (html) items.push(html);
  }
  return items;
}

function pushLooseText(chunk: string, tokens: Token[]): void {
  for (const part of chunk.split(/<br\s*\/?>|\r?\n/i)) {
    const html = part.trim();
    if (!html) continue;
    if (/<li\b/i.test(html)) {
      const items = extractListItems(html);
      if (items.length) tokens.push({kind: 'list', ordered: false, items});
      continue;
    }
    tokens.push({kind: 'text', html});
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  BLOCK_PATTERN.lastIndex = 0;
  while ((match = BLOCK_PATTERN.exec(source))) {
    if (match.index > cursor) {
      pushLooseText(source.slice(cursor, match.index), tokens);
    }
    cursor = match.index + match[0].length;

    const tag = (match[1] ?? '').toLowerCase();
    const inner = match[2] ?? '';

    if (tag === 'p') {
      tokens.push({kind: 'text', html: inner});
    } else if (/^h[1-6]$/.test(tag)) {
      tokens.push({
        kind: 'heading',
        level: tag === 'h1' || tag === 'h2' ? 2 : 3,
        html: inner,
      });
    } else if (tag === 'ul' || tag === 'ol') {
      tokens.push({
        kind: 'list',
        ordered: tag === 'ol',
        items: extractListItems(inner),
      });
    } else {
      // <hr>, <table>, <blockquote>, <pre>, <figure> — rendered as-is.
      tokens.push({kind: 'html', html: match[0]});
    }
  }

  if (cursor < source.length) {
    pushLooseText(source.slice(cursor), tokens);
  }

  return tokens;
}

export type ParseRichTextOptions = {
  /** Dropped when the body's first line just repeats it. */
  title?: string | null;
  /**
   * Treat shouty, label-ish paragraphs as headings even when the author never
   * used a real <h2>. This rescues pasted-together legal copy ("SHIPPING"),
   * but it misreads marketing banners ("FREE SHIPPING OVER 2000 EGP"), so
   * only turn it on for documents we know are legal text.
   */
  inferHeadings?: boolean;
};

/**
 * Turn a CMS page/policy body into styled-ready blocks.
 *
 * Real `<h2>`/`<h3>` tags are always honoured. `inferHeadings` additionally
 * promotes loose label-ish paragraphs, which is what the terms body needs.
 */
export function parseRichText(
  body: string | null | undefined,
  options: ParseRichTextOptions = {},
): RichTextDocument {
  const source = String(body ?? '')
    // <div> wrappers carry no meaning once we re-layout, and they would confuse
    // the block tokenizer.
    .replace(/<\/?div\b[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  const blocks: RichTextBlock[] = [];
  const sections: RichTextSection[] = [];
  const seenIds = new Map<string, number>();
  const titleKey = options.title ? toComparable(options.title) : '';
  const infer = options.inferHeadings === true;

  let pendingItems: string[] = [];
  let afterHeading = false;

  const isFirst = () => blocks.length === 0;

  const flushItems = () => {
    if (!pendingItems.length) return;
    // Only ever fed by dash-prefixed paragraphs, so never ordered.
    blocks.push({type: 'list', ordered: false, items: pendingItems});
    pendingItems = [];
  };

  const pushHeading = (level: 2 | 3, html: string) => {
    const text = toPlainText(html);
    if (!text) return;
    const id = uniqueId(slugify(text), seenIds);
    blocks.push({type: 'heading', level, id, html, text});
    if (level === 2) sections.push({id, text});
  };

  for (const token of tokenize(source)) {
    // Consecutive dash paragraphs fold into a single list.
    if (token.kind === 'text') {
      const text = toPlainText(token.html);
      if (infer && text && BULLET_PREFIX.test(text)) {
        pendingItems.push(stripBullet(token.html));
        continue;
      }
    }

    flushItems();

    if (token.kind === 'list') {
      const items = token.items.filter((item) => toPlainText(item));
      if (items.length) blocks.push({type: 'list', ordered: token.ordered, items});
      afterHeading = false;
      continue;
    }

    if (token.kind === 'html') {
      blocks.push({type: 'html', html: token.html});
      afterHeading = false;
      continue;
    }

    const text = toPlainText(token.html);
    if (!text) {
      // Whitespace-only paragraph, but it may still hold an <img> or <iframe>.
      if (/<[a-z]/i.test(token.html)) {
        blocks.push({type: 'html', html: token.html});
      }
      continue;
    }

    // The body very often opens with a line that just repeats the page title.
    if (isFirst() && titleKey && toComparable(text) === titleKey) continue;

    if (token.kind === 'heading') {
      pushHeading(token.level, token.html);
      afterHeading = true;
      continue;
    }

    if (infer && looksLikeHeading(text)) {
      pushHeading(isAllCaps(text) ? 2 : 3, token.html);
      afterHeading = true;
      continue;
    }

    // A short, unpunctuated line straight after a heading reads as a standfirst.
    const isLead = afterHeading && text.length <= 90 && !/[.!?]$/.test(text);
    blocks.push({type: isLead ? 'lead' : 'paragraph', html: token.html});
    afterHeading = false;
  }

  flushItems();

  return {blocks, sections};
}
