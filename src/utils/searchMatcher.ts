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
 * Set on an element whose text is shown in another scheme than the stored one:
 * the stored text, which in-page search also matches. The element's text is the
 * shown form, optionally followed by whitespace.
 */
export const STORED_TEXT_ATTRIBUTE = 'data-stored-text';

/** A place in the DOM: the index of a text node in document order, and an offset in it */
interface DomPosition {
  node: number;
  offset: number;
}

type FoundMatch = [from: DomPosition, to: DomPosition];

/**
 * Folded text to match, built from the DOM in pieces. A piece is a text node as
 * shown, or a word shown in another scheme searched by its stored text; a match
 * in that word covers the whole word, since its letters do not line up.
 */
class SearchedText {
  text = '';
  private readonly starts: number[] = [];
  /** The text node each piece is, or -1 for a stored word */
  private readonly pieceNodes: number[] = [];
  private readonly words = new Map<number, FoundMatch>();

  constructor(private readonly maps: (number[] | null)[]) {}

  addNode(node: number, folded: string) {
    this.starts.push(this.text.length);
    this.pieceNodes.push(node);
    this.text += folded;
  }

  addWord(folded: string, shown: FoundMatch) {
    this.words.set(this.starts.length, shown);
    this.starts.push(this.text.length);
    this.pieceNodes.push(-1);
    this.text += folded;
  }

  /** Whitespace between words: never the start or end of a match, so it needs no piece */
  addSpace() {
    this.text += ' ';
  }

  private pieceAt(position: number): number {
    let low = 0;
    let high = this.starts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.starts[middle] <= position) low = middle;
      else high = middle - 1;
    }
    return low;
  }

  private positionOf(position: number, edge: 'from' | 'to'): DomPosition {
    const piece = this.pieceAt(edge === 'from' ? position : position - 1);
    const node = this.pieceNodes[piece];
    if (node === -1) return this.words.get(piece)![edge === 'from' ? 0 : 1];
    const local = position - this.starts[piece];
    const map = this.maps[node];
    return {
      node,
      offset: edge === 'from' ? toOriginalStart(map, local) : toOriginalEnd(map, local),
    };
  }

  matches(regex: RegExp): FoundMatch[] {
    return Array.from(this.text.matchAll(regex), (match) => {
      const start = match.index ?? 0;
      return [this.positionOf(start, 'from'), this.positionOf(start + match[0].length, 'to')];
    });
  }
}

const isBefore = (a: DomPosition, b: DomPosition) =>
  a.node < b.node || (a.node === b.node && a.offset < b.offset);

/** Matches from both searched texts in document order, each place found once */
const mergeMatches = (shown: FoundMatch[], stored: FoundMatch[]): FoundMatch[] => {
  const all = [...shown, ...stored].sort(([a], [b]) =>
    isBefore(a, b) ? -1 : isBefore(b, a) ? 1 : 0
  );
  const merged: FoundMatch[] = [];
  all.forEach((match) => {
    const previous = merged[merged.length - 1];
    if (!previous || !isBefore(match[0], previous[1])) merged.push(match);
  });
  return merged;
};

const NOT_WHITESPACE = /\S/;

/**
 * The searched text with the stored form of each word shown in another scheme.
 * Every other text node is searched as shown, as in the shown text.
 */
const storedText = (nodes: Text[], folded: string[], maps: (number[] | null)[]): SearchedText => {
  const searched = new SearchedText(maps);
  const owners = new Map<Element, Element | null>();
  const ownerOf = (node: Text): Element | null => {
    const parent = node.parentElement;
    if (!parent) return null;
    if (!owners.has(parent)) {
      // A segment holds whole words, so the walk up stops there
      const found = parent.closest(`[${STORED_TEXT_ATTRIBUTE}], [data-segment-number]`);
      owners.set(parent, found?.hasAttribute(STORED_TEXT_ATTRIBUTE) ? found : null);
    }
    return owners.get(parent) ?? null;
  };

  /** Where the shown word lies in text nodes `first` to `last`, without its whitespace */
  const shownWord = (first: number, last: number): FoundMatch | null => {
    let from: DomPosition | null = null;
    let to: DomPosition | null = null;
    for (let node = first; node <= last; node += 1) {
      const { data } = nodes[node];
      const start = data.search(NOT_WHITESPACE);
      if (start !== -1) {
        from ??= { node, offset: start };
        to = { node, offset: data.trimEnd().length };
      }
    }
    return from && to ? [from, to] : null;
  };

  let index = 0;
  while (index < nodes.length) {
    const owner = ownerOf(nodes[index]);
    if (owner) {
      // The owner's text nodes: the shown word (perhaps inside a <mark>), then whitespace
      let last = index;
      while (last + 1 < nodes.length && ownerOf(nodes[last + 1]) === owner) last += 1;
      const word = shownWord(index, last);
      if (word) {
        searched.addWord(
          foldForSearch(owner.getAttribute(STORED_TEXT_ATTRIBUTE) ?? '').folded,
          word
        );
        if (/\s$/.test(nodes[last].data)) searched.addSpace();
      }
      index = last + 1;
    } else {
      searched.addNode(index, folded[index]);
      index += 1;
    }
  }
  return searched;
};

/**
 * Matches of `query` in the text under `root`, across element boundaries. Subtrees marked
 * `data-search-ignore` are skipped. The DOM is only read: highlighting is up to the caller.
 *
 * Words shown in another scheme (marked with STORED_TEXT_ATTRIBUTE) match by their
 * stored text as well as by what is shown, so an IAST or plain query (krsna) finds
 * kṛṣṇa shown as कृष्ण, and a query typed in the shown scheme finds it too.
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

  // All folded text in document order, as shown
  const nodes: Text[] = [];
  const folded: string[] = [];
  const maps: (number[] | null)[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const result = foldForSearch((node as Text).data);
    if (result.folded) {
      nodes.push(node as Text);
      folded.push(result.folded);
      maps.push(result.map);
    }
  }
  const shown = new SearchedText(maps);
  folded.forEach((text, index) => shown.addNode(index, text));

  const found = root.querySelector(`[${STORED_TEXT_ATTRIBUTE}]`)
    ? mergeMatches(shown.matches(regex), storedText(nodes, folded, maps).matches(regex))
    : shown.matches(regex);

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

  return found.map(([from, to]) => ({
    range: new StaticRange({
      startContainer: nodes[from.node],
      startOffset: from.offset,
      endContainer: nodes[to.node],
      endOffset: to.offset,
    }),
    segment: segmentOf(nodes[from.node]),
  }));
};
