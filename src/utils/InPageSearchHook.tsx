import { useState, useEffect, useCallback, useRef } from 'react';
import Mark from 'mark.js';
import { useDebouncedValue, useHotkeys } from '@mantine/hooks';

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
  const [debounced] = useDebouncedValue(searchQuery, 200);
  const extraDiacritics = [
  { base: 'm', letters: 'ṃṁ' }, // add dot-below/above m
  { base: 's', letters: 'śṣ' },
];



  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  
  const markInstanceRef = useRef<Mark | null>(null);
  const matchedElementsRef = useRef<Element[]>([]);
  const previousQueryRef = useRef('');

  // Helper function to resolve segment number from an element
  const resolveSegmentFromElement = useCallback((element: Element): number | null => {
    // 1. Check if any existing segmentRef contains this element
    for (const [segNum, segEl] of segmentRefs.current.entries()) {
      if (segEl === element || segEl.contains(element) || element.contains(segEl)) {
        return segNum;
      }
    }

    // 2. Try data-segment-number attribute
    let currentElement: Element | null = element;
    while (currentElement) {
      const segmentAttr = currentElement.getAttribute('data-segment-number');
      if (segmentAttr) {
        const parsed = parseInt(segmentAttr, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      currentElement = currentElement.parentElement;
    }

    // 3. Try id="segment-###"
    currentElement = element;
    while (currentElement) {
      if (currentElement.id?.startsWith('segment-')) {
        const parsed = parseInt(currentElement.id.replace('segment-', ''), 10);
        if (!isNaN(parsed)) return parsed;
      }
      currentElement = currentElement.parentElement;
    }

    // 4. Look for lineContainer class
    currentElement = element;
    while (currentElement) {
      if (
        currentElement.className &&
        typeof currentElement.className === 'string' &&
        currentElement.className.includes('lineContainer')
      ) {
        // Try to resolve from lineContainer
        for (const [segNum, segEl] of segmentRefs.current.entries()) {
          if (segEl === currentElement || segEl.contains(currentElement) || currentElement.contains(segEl)) {
            return segNum;
          }
        }
      }
      currentElement = currentElement.parentElement;
    }

    return null;
  }, [segmentRefs]);

  // Find and highlight matches using Mark.js
  const findMatches = useCallback((query: string) => {
    if (!containerRef.current || !query.trim()) {
      if (markInstanceRef.current) {
        markInstanceRef.current.unmark();
      }
      matchedElementsRef.current = [];
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      onMatchedSegmentsChange([]);
      return;
    }

    // Create Mark instance if needed
    if (!markInstanceRef.current) {
      markInstanceRef.current = new Mark(containerRef.current);
    }

    // Clear previous highlights
    markInstanceRef.current.unmark({
      done: () => {
        const matchedSegmentNumbers = new Set<number>();
        const newMatchedElements: Element[] = [];

        // Mark the search query
        markInstanceRef.current!.mark(query, {
          className: 'search-highlight',
          caseSensitive: false,
          separateWordSearch: false,
          acrossElements: true,
          diacritics: true, // Enable diacritics insensitivity
          synonyms: { 'ṃ': 'm', 'ṁ': 'm', 'ḥ': 'h', 'ś': 's', 'ṣ': 's', 'ṭ': 't', 'ṛ': 'r', 'ṇ': 'n' }, // Basic Sanskrit diacritics

          accuracy: 'complementary', // Improved matching for diacritics
          each: (element) => {
            newMatchedElements.push(element);
            
            // Resolve segment number for this match
            const segmentNumber = resolveSegmentFromElement(element);
            if (segmentNumber !== null) {
              matchedSegmentNumbers.add(segmentNumber);
            }
          },
          done: (totalMarks) => {
            matchedElementsRef.current = newMatchedElements;
            setTotalMatches(totalMarks);
            
            // Update matched segments
            const segmentArray = Array.from(matchedSegmentNumbers);
            onMatchedSegmentsChange(segmentArray);
            console.log('Matched Segments from In-Page Search:', segmentArray);
            
            // Highlight and scroll to first match
            if (newMatchedElements.length > 0) {
              setCurrentMatchIndex(0);
              newMatchedElements[0].classList.add('search-highlight-current');
              newMatchedElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              setCurrentMatchIndex(0);
            }
          }
        });
      }
    });
  }, [containerRef, onMatchedSegmentsChange, resolveSegmentFromElement]);

  // Navigate to next match
  const goToNextMatch = useCallback(() => {
    const matches = matchedElementsRef.current;
    if (matches.length === 0) return;
    
    // Remove current highlight
    matches[currentMatchIndex]?.classList.remove('search-highlight-current');
    
    // Calculate next index
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    
    // Apply new highlight and scroll
    matches[nextIndex].classList.add('search-highlight-current');
    matches[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatchIndex]);

  // Navigate to previous match
  const goToPreviousMatch = useCallback(() => {
    const matches = matchedElementsRef.current;
    if (matches.length === 0) return;
    
    // Remove current highlight
    matches[currentMatchIndex]?.classList.remove('search-highlight-current');
    
    // Calculate previous index
    const prevIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    
    // Apply new highlight and scroll
    matches[prevIndex].classList.add('search-highlight-current');
    matches[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatchIndex]);

  // Handle search query changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== previousQueryRef.current) {
        findMatches(searchQuery);
        previousQueryRef.current = searchQuery;
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, findMatches]);

  useHotkeys([
    ['mod+F', () => setIsSearchVisible(prev => !prev)],
    ['Escape', () => {
      if (isSearchVisible) {
        setIsSearchVisible(false);
      }
    }],
  ]);

  // Clear highlights when search is closed
  useEffect(() => {
    if (!isSearchVisible) {
      if (markInstanceRef.current) {
        markInstanceRef.current.unmark();
      }
      matchedElementsRef.current = [];
      setSearchQuery('');
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      onMatchedSegmentsChange([]);
    }
  }, [isSearchVisible, onMatchedSegmentsChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markInstanceRef.current) {
        markInstanceRef.current.unmark();
      }
    };
  }, []);

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
      if (markInstanceRef.current) {
        markInstanceRef.current.unmark();
      }
      matchedElementsRef.current = [];
      setSearchQuery('');
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      onMatchedSegmentsChange([]);
    }
  };
};