import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInPageSearchProps {
  containerRef: React.RefObject<HTMLDivElement>;
  segmentRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onMatchedSegmentsChange: (segments: number[]) => void;
}

export const useInPageSearch = ({
  containerRef,
  segmentRefs,
  onMatchedSegmentsChange
}: UseInPageSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const matchedElementsRef = useRef<HTMLElement[]>([]);
  const previousQueryRef = useRef('');

  // Clean up previous highlights
  const clearHighlights = useCallback(() => {
    if (!containerRef.current) return;
    
    const highlights = containerRef.current.querySelectorAll('.search-highlight');
    highlights.forEach(element => {
      const parent = element.parentNode;
      if (parent) {
        // Replace the highlighted span with its text content
        const textNode = document.createTextNode(element.textContent || '');
        parent.replaceChild(textNode, element);
        // Normalize to merge adjacent text nodes
        parent.normalize();
      }
    });
    
    matchedElementsRef.current = [];
  }, [containerRef]);

  // Find and highlight matches
  const findMatches = useCallback((query: string) => {
    if (!containerRef.current || !query.trim()) {
      clearHighlights();
      setTotalMatches(0);
      onMatchedSegmentsChange([]);
      return;
    }

    // Clear previous highlights
    clearHighlights();
    
    const matchedSegmentNumbers = new Set<number>();
    const newMatchedElements: HTMLElement[] = [];

    
    // Create a regex for the search (case-insensitive)
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    

        const resolveSegmentFromLineContainer = (el: HTMLElement | null): number | null => {
      if (!el) return null;

      // 1. If any existing segmentRef contains this line container, use that key
      for (const [segNum, segEl] of segmentRefs.current.entries()) {
        if (segEl === el || segEl.contains(el) || el.contains(segEl)) {
          return segNum;
        }
      }

      // 2. Try id="segment-###" on this element or its parent
      if (el.id?.startsWith('segment-')) {
        const n = parseInt(el.id.replace('segment-', ''), 10);
        if (!isNaN(n)) return n;
      }
      if (el.parentElement?.id?.startsWith('segment-')) {
        const n = parseInt(el.parentElement.id.replace('segment-', ''), 10);
        if (!isNaN(n)) return n;
      }

      // 3. Last resort: look upward one more level for a numeric pattern
      let p: HTMLElement | null = el.parentElement;
      while (p) {
        if (p.id?.startsWith('segment-')) {
          const n = parseInt(p.id.replace('segment-', ''), 10);
            if (!isNaN(n)) return n;
        }
        p = p.parentElement;
      }
      return null;
    };

    const walkTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const matches = [...text.matchAll(regex)];

        if (matches.length > 0) {
          // ORIGINAL: look for data-segment-number
            let segmentElement: HTMLElement | null = node.parentElement;
            while (segmentElement && !segmentElement.hasAttribute('data-segment-number')) {
              segmentElement = segmentElement.parentElement;
            }

            let segmentNumber: number | null = null;
            if (segmentElement && segmentElement.hasAttribute('data-segment-number')) {
              const parsed = parseInt(segmentElement.getAttribute('data-segment-number') || '0', 10);
              if (!isNaN(parsed) && parsed > 0) segmentNumber = parsed;
            }

            // FALLBACK: no data attribute found, try line container ancestor
            if (segmentNumber == null) {
              // climb from original parent again to find a line container class
              let lineContainer: HTMLElement | null = (node.parentElement as HTMLElement | null);
              while (lineContainer) {
                if (
                  lineContainer.className &&
                  typeof lineContainer.className === 'string' &&
                  lineContainer.className.includes('lineContainer')
                ) {
                  segmentNumber = resolveSegmentFromLineContainer(lineContainer);
                  if (segmentNumber != null) break;
                }
                lineContainer = lineContainer.parentElement;
              }
            }

            if (segmentNumber != null) {
              matchedSegmentNumbers.add(segmentNumber);
            }

          // Highlight text (unchanged)
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          matches.forEach((match) => {
            const matchIndex = match.index!;
            if (matchIndex > lastIndex) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex, matchIndex)));
            }
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'search-highlight';
            highlightSpan.style.backgroundColor = 'rgba(255, 235, 59, 0.5)';
            highlightSpan.style.color = 'inherit';
            highlightSpan.style.borderRadius = '2px';
            highlightSpan.style.padding = '0 2px';
            highlightSpan.textContent = match[0];
            fragment.appendChild(highlightSpan);
            newMatchedElements.push(highlightSpan);
            lastIndex = matchIndex + match[0].length;
          });
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
          }
          if (node.parentNode) {
            node.parentNode.replaceChild(fragment, node);
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (
          !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName) &&
          !element.classList.contains('search-highlight')
        ) {
          Array.from(node.childNodes).forEach(child => walkTextNodes(child));
        }
      }
    };

    walkTextNodes(containerRef.current);

    matchedElementsRef.current = newMatchedElements;
    setTotalMatches(newMatchedElements.length);
    setCurrentMatchIndex(newMatchedElements.length > 0 ? 0 : -1);

    if (newMatchedElements.length > 0) {
      newMatchedElements[0].style.backgroundColor = 'rgba(255, 152, 0, 0.6)';
      newMatchedElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    onMatchedSegmentsChange(Array.from(matchedSegmentNumbers));
    console.log(
      'Matched Segments from In-Page Search:',
      Array.from(matchedSegmentNumbers)
    );
  }, [containerRef, clearHighlights, onMatchedSegmentsChange, segmentRefs]);

  // Navigate to next match
  const goToNextMatch = useCallback(() => {
    if (matchedElementsRef.current.length === 0) return;
    
    // Reset previous current match style
    if (currentMatchIndex >= 0 && currentMatchIndex < matchedElementsRef.current.length) {
      matchedElementsRef.current[currentMatchIndex].style.backgroundColor = 'rgba(255, 235, 59, 0.5)';
    }
    
    // Calculate next index
    const nextIndex = (currentMatchIndex + 1) % matchedElementsRef.current.length;
    setCurrentMatchIndex(nextIndex);
    
    // Highlight and scroll to new current match
    matchedElementsRef.current[nextIndex].style.backgroundColor = 'rgba(255, 152, 0, 0.6)';
    matchedElementsRef.current[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatchIndex]);

  // Navigate to previous match
  const goToPreviousMatch = useCallback(() => {
    if (matchedElementsRef.current.length === 0) return;
    
    // Reset previous current match style
    if (currentMatchIndex >= 0 && currentMatchIndex < matchedElementsRef.current.length) {
      matchedElementsRef.current[currentMatchIndex].style.backgroundColor = 'rgba(255, 235, 59, 0.5)';
    }
    
    // Calculate previous index
    const prevIndex = currentMatchIndex <= 0 
      ? matchedElementsRef.current.length - 1 
      : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    
    // Highlight and scroll to new current match
    matchedElementsRef.current[prevIndex].style.backgroundColor = 'rgba(255, 152, 0, 0.6)';
    matchedElementsRef.current[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatchIndex]);

  // Handle search query changes
  useEffect(() => {
    // Debounce the search
    const timeoutId = setTimeout(() => {
      if (searchQuery !== previousQueryRef.current) {
        findMatches(searchQuery);
        previousQueryRef.current = searchQuery;
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, findMatches]);

  // Set up keyboard shortcut (Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchVisible(prev => !prev);
      }
      
      // Escape to close search
      if (e.key === 'Escape' && isSearchVisible) {
        setIsSearchVisible(false);
        clearHighlights();
        setSearchQuery('');
        onMatchedSegmentsChange([]);
      }
      
      // Enter to go to next match (when search is active)
      if (e.key === 'Enter' && isSearchVisible && !e.shiftKey) {
        e.preventDefault();
        goToNextMatch();
      }
      
      // Shift+Enter to go to previous match
      if (e.key === 'Enter' && isSearchVisible && e.shiftKey) {
        e.preventDefault();
        goToPreviousMatch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchVisible, clearHighlights, goToNextMatch, goToPreviousMatch, onMatchedSegmentsChange]);

  // Clear highlights when search is closed
  useEffect(() => {
    if (!isSearchVisible) {
      clearHighlights();
      setSearchQuery('');
      onMatchedSegmentsChange([]);
    }
  }, [isSearchVisible, clearHighlights, onMatchedSegmentsChange]);

  return {
    searchQuery,
    setSearchQuery,
    isSearchVisible,
    setIsSearchVisible,
    currentMatchIndex,
    totalMatches,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch: () => {
      clearHighlights();
      setSearchQuery('');
      onMatchedSegmentsChange([]);
    }
  };
};