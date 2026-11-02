// Diacritic-insensitive search shared by HighlightText and the in-page search.
// Text and query are folded (accents dropped, lowercased) and matched with a regular
// expression; offsets are mapped back to the original text so nothing in it changes.

export type MatchRange = [start: number, end: number];

export interface SearchOptions {
  /** Match each whitespace-separated term on its own instead of the whole phrase */
  separateWords?: boolean;
}

export interface DomMatch {
  range: StaticRange;
  /** `data-segment-number` of the nearest segment holding the match start */
  segment: number | null;
}

/** Latin combining marks: dots, macrons, accents, ring below. Devanagari signs lie outside it. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;
const NON_ASCII = /[^\p{ASCII}]/u;
/** A match grows to the whole word around it, stopping at spaces, punctuation and dandas */
const WORD_LIMITS = '\\s!"#$%&\'()*+,\\-./:;<=>?@\\[\\\\\\]^_`{|}~¡¿।॥';

const foldCache = new Map<string, string>();

const foldChar = (char: string): string => {
  let folded = foldCache.get(char);
  if (folded === undefined) {
    folded = char.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
    foldCache.set(char, folded);
  }
  return folded;
};

/**
 * Fold text for matching: `kṛṣṇa`, `KR̥ṢṆA` and `krsna` all become `krsna`.
 * `map[i]` is the original offset of folded character `i`, with `text.length` appended;
 * it is null when every offset is unchanged.
 */
export const foldForSearch = (text: string): { folded: string; map: number[] | null } => {
  if (!NON_ASCII.test(text)) {
    return { folded: text.toLowerCase(), map: null };
  }
  let folded = '';
  const map: number[] = [];
  let offset = 0;
  for (const char of text) {
    const foldedChar = foldChar(char);
    for (let i = 0; i < foldedChar.length; i += 1) {
      map.push(offset);
    }
    folded += foldedChar;
    offset += char.length;
  }
  map.push(text.length);
  return { folded, map };
};

const toOriginalStart = (map: number[] | null, position: number): number =>
  map ? map[position] : position;

// The original offset after folded position `position - 1`. It lies past any accents
// that follow, so a match never cuts `r̥` in half.
const toOriginalEnd = (map: number[] | null, position: number): number => {
  if (!map) return position;
  let next = position;
  // A character that folded to several characters is kept whole
  while (next < map.length - 1 && map[next] === map[next - 1]) {
    next += 1;
  }
  return map[next];
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The regular expression for a query over folded text, or null when nothing is left to find */
export const buildSearchRegExp = (
  query: string,
  { separateWords = false }: SearchOptions = {}
): RegExp | null => {
  const folded = foldForSearch(query).folded.trim();
  if (!folded) return null;
  const terms = separateWords
    ? Array.from(new Set(folded.split(/\s+/))).sort((a, b) => b.length - a.length)
    : [folded];
  const pattern = terms.map((term) => escapeRegExp(term).replace(/\s+/g, '\\s+')).join('|');
  return new RegExp(`[^${WORD_LIMITS}]*(?:${pattern})[^${WORD_LIMITS}]*`, 'g');
};

/** Matches of `query` in a plain string, as offsets into that string */
export const findMatchRanges = (
  text: string,
  query: string,
  options?: SearchOptions
): MatchRange[] => {
  const regex = buildSearchRegExp(query, options);
  if (!regex || !text) return [];
  const { folded, map } = foldForSearch(text);
  return Array.from(folded.matchAll(regex), (match) => {
    const start = match.index ?? 0;
    return [toOriginalStart(map, start), toOriginalEnd(map, start + match[0].length)];
  });
};

/**
 * Matches of `query` in the text under `root`, across element boundaries. Subtrees marked
 * `data-search-ignore` are skipped. The DOM is only read: highlighting is up to the caller.
 */
export const findDomMatches = (root: Element, query: string): DomMatch[] => {
  const regex = buildSearchRegExp(query);
  if (!regex) return [];

  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
        const element = node as Element;
        return element.hasAttribute('data-search-ignore') ||
          element.tagName === 'SCRIPT' ||
          element.tagName === 'STYLE'
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_SKIP;
      },
    }
  );

  // All folded text in document order, with where each text node starts in it
  const nodes: Text[] = [];
  const starts: number[] = [];
  const maps: (number[] | null)[] = [];
  let text = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const { folded, map } = foldForSearch((node as Text).data);
    if (folded) {
      nodes.push(node as Text);
      starts.push(text.length);
      maps.push(map);
      text += folded;
    }
  }

  const nodeIndexAt = (position: number): number => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (starts[middle] <= position) low = middle;
      else high = middle - 1;
    }
    return low;
  };

  const segments = new Map<Element, number | null>();
  const segmentOf = (node: Text): number | null => {
    const parent = node.parentElement;
    if (!parent) return null;
    if (!segments.has(parent)) {
      const value = parent.closest('[data-segment-number]')?.getAttribute('data-segment-number');
      const segment = value ? parseInt(value, 10) : NaN;
      segments.set(parent, Number.isNaN(segment) ? null : segment);
    }
    return segments.get(parent) ?? null;
  };

  return Array.from(text.matchAll(regex), (match) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const first = nodeIndexAt(start);
    const last = nodeIndexAt(end - 1);
    return {
      range: new StaticRange({
        startContainer: nodes[first],
        startOffset: toOriginalStart(maps[first], start - starts[first]),
        endContainer: nodes[last],
        endOffset: toOriginalEnd(maps[last], end - starts[last]),
      }),
      segment: segmentOf(nodes[first]),
    };
  });
};
