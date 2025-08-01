import React, { useEffect, useRef } from 'react';
import Mark from 'mark.js';
import classes from './HighlightText.module.css';

interface HighlightTextProps {
  text: string;
  query: string;
  isSearchResult?: boolean;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, query, isSearchResult }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && query && query.trim()) {
      const instance = new Mark(containerRef.current);
      const searchTerms = query.trim().split(/\s+/);
      instance.mark(searchTerms, {
        separateWordSearch: true,
        diacritics: true, // Enable diacritic insensitivity
        accuracy: 'complementary', // Improved matching for diacritics
        caseSensitive: false, // Case insensitive matching
      });
    }
  }, [text, query]);

  return (
    <div
      ref={containerRef}
      className={isSearchResult ? classes.highlightedBox : classes.highlightedText}
    >
      {text}
    </div>
  );
};

export default HighlightText;
