import React, { useMemo } from 'react';
import { findMatchRanges } from './searchMatcher';
import classes from './HighlightText.module.css';

interface HighlightTextProps {
  text: string;
  query: string;
  isSearchResult?: boolean;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, query, isSearchResult }) => {
  // Rendered from the plain string every time, so marks from an earlier query never linger
  const pieces = useMemo(() => {
    const ranges = findMatchRanges(text, query, { separateWords: true });
    if (!ranges.length) return text;
    const result: React.ReactNode[] = [];
    let cursor = 0;
    ranges.forEach(([start, end]) => {
      if (start > cursor) result.push(text.slice(cursor, start));
      result.push(<mark key={start}>{text.slice(start, end)}</mark>);
      cursor = end;
    });
    if (cursor < text.length) result.push(text.slice(cursor));
    return result;
  }, [text, query]);

  return (
    <div className={isSearchResult ? classes.highlightedBox : classes.highlightedText}>
      {pieces}
    </div>
  );
};

export default HighlightText;
