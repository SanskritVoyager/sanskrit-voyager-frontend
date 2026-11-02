import { useState, useEffect, useCallback, useRef } from 'react';
import { useHotkeys } from '@mantine/hooks';
import { DomMatch, findDomMatches } from './searchMatcher';

interface UseInPageSearchProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onMatchedSegmentsChange: React.Dispatch<React.SetStateAction<number[]>>;
  /** Changes whenever the rendered text may have changed, so an open search runs again */
  contentKey?: unknown;
}

// Matches are painted with the CSS Custom Highlight API (styled by ::highlight() rules in
// InPageSearch.module.css), so the React-owned book DOM is never modified
const ALL_MATCHES = 'search-highlight';
const CURRENT_MATCH = 'search-highlight-current';

const supportsHighlights = (): boolean =>
  typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

const clearHighlights = () => {
  if (!supportsHighlights()) return;
  CSS.highlights.delete(ALL_MATCHES);
  CSS.highlights.delete(CURRENT_MATCH);
};

// The current match lives only in its own highlight, so the two colours never stack
const paintHighlights = (matches: DomMatch[], current: number) => {
  if (!supportsHighlights()) return;
  const all = new Highlight();
  matches.forEach(({ range }, index) => {
    if (index !== current) all.add(range);
  });
  const currentHighlight = new Highlight();
  if (matches[current]) currentHighlight.add(matches[current].range);
  currentHighlight.priority = 1;
  CSS.highlights.set(ALL_MATCHES, all);
  CSS.highlights.set(CURRENT_MATCH, currentHighlight);
};

const moveCurrentHighlight = (from: DomMatch | undefined, to: DomMatch | undefined) => {
  if (!supportsHighlights()) return;
  const all = CSS.highlights.get(ALL_MATCHES);
  const current = CSS.highlights.get(CURRENT_MATCH);
  if (!all || !current) return;
  if (from) all.add(from.range);
  current.clear();
  if (to) {
    all.delete(to.range);
    current.add(to.range);
  }
};

const scrollParentOf = (element: Element): Element | null => {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (/auto|scroll|overlay/.test(overflowY) && el.scrollHeight > el.clientHeight) return el;
  }
  return null;
};

// Centre the match itself: its parent can be a whole paragraph taller than the screen
const scrollToMatch = ({ range }: DomMatch) => {
  const anchor = range.startContainer.parentElement;
  if (!anchor?.isConnected) return;
  let rect: DOMRect | null = null;
  try {
    const live = document.createRange();
    live.setStart(range.startContainer, range.startOffset);
    live.setEnd(range.endContainer, range.endOffset);
    // jsdom has no range geometry
    rect = live.getBoundingClientRect?.() ?? null;
  } catch {
    // The text changed under a stale match: fall back to its element
  }
  if (!rect) {
    anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const scroller = scrollParentOf(anchor);
  const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
  const viewHeight = scroller ? scroller.clientHeight : window.innerHeight;
  const top = rect.top + rect.height / 2 - (viewTop + viewHeight / 2);
  (scroller ?? window).scrollBy({ top, behavior: 'smooth' });
};

const sameSegments = (a: number[], b: number[]) =>
  a.length === b.length && a.every((segment, index) => segment === b[index]);

export const useInPageSearch = ({
  containerRef,
  onMatchedSegmentsChange,
  contentKey,
}: UseInPageSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  const matchesRef = useRef<DomMatch[]>([]);
  const currentIndexRef = useRef(0);
  const lastSearchRef = useRef({ query: '', visible: false });
  const onSegmentsRef = useRef(onMatchedSegmentsChange);
  onSegmentsRef.current = onMatchedSegmentsChange;

  const showMatches = useCallback((matches: DomMatch[], current: number) => {
    matchesRef.current = matches;
    currentIndexRef.current = current;
    setTotalMatches(matches.length);
    setCurrentMatchIndex(current);
    if (matches.length) paintHighlights(matches, current);
    else clearHighlights();

    const segments = Array.from(
      new Set(matches.flatMap(({ segment }) => (segment === null ? [] : [segment])))
    );
    // Keeping the previous array skips a re-render of the whole book
    onSegmentsRef.current((previous) => (sameSegments(previous, segments) ? previous : segments));
  }, []);

  const clearSearch = useCallback(() => {
    showMatches([], 0);
    setSearchQuery('');
  }, [showMatches]);

  // Search on a new query, on opening, and again after the text changes under an open search
  useEffect(() => {
    const last = lastSearchRef.current;
    lastSearchRef.current = { query: searchQuery, visible: isSearchVisible };
    if (!isSearchVisible) {
      if (last.visible) clearSearch();
      return;
    }

    const container = containerRef.current;
    const matches = container && searchQuery.trim() ? findDomMatches(container, searchQuery) : [];
    const isNewSearch = !last.visible || last.query !== searchQuery;
    // A content change keeps the reader's place instead of jumping back to the first match
    const current = isNewSearch
      ? 0
      : Math.min(currentIndexRef.current, Math.max(matches.length - 1, 0));
    showMatches(matches, current);
    if (isNewSearch && matches[0]) scrollToMatch(matches[0]);
  }, [isSearchVisible, searchQuery, contentKey, containerRef, showMatches, clearSearch]);

  // Clear highlights on unmount
  useEffect(() => clearHighlights, []);

  const goToMatch = useCallback((step: number) => {
    const matches = matchesRef.current;
    if (matches.length === 0) return;
    const previous = currentIndexRef.current;
    const next = (previous + step + matches.length) % matches.length;
    currentIndexRef.current = next;
    setCurrentMatchIndex(next);
    moveCurrentHighlight(matches[previous], matches[next]);
    scrollToMatch(matches[next]);
  }, []);

  const goToNextMatch = useCallback(() => goToMatch(1), [goToMatch]);
  const goToPreviousMatch = useCallback(() => goToMatch(-1), [goToMatch]);

  useHotkeys([
    ['mod+F', () => setIsSearchVisible(prev => !prev)],
    ['Escape', () => {
      if (isSearchVisible) {
        setIsSearchVisible(false);
      }
    }],
  ]);

  return {
    searchQuery,
    setSearchQuery,
    isSearchVisible,
    setIsSearchVisible,
    currentMatchIndex,
    totalMatches,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch,
  };
};
