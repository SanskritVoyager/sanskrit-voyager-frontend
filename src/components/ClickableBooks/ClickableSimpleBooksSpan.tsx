import React from 'react';
import classes from './ClickableSimpleBooks.module.css'; // Reuse styles if applicable
import { useDisplayWord } from '../../context/TransliterationContext';
import { displaySanskrit } from '../../utils/displayWord';
import { STORED_TEXT_ATTRIBUTE } from '../../utils/searchMatcher';

interface BookSpanProps {
  wordText: string; // The word as stored, with its trailing space (e.g., "word ")
  wordKey: string; // Unique key for React
  /**
   * Show the word in the navbar's scheme. The span reads the scheme itself, so a
   * switch redraws the words alone, not the segments around them.
   */
  convertible?: boolean;
  isSanskrit?: boolean; // Optional flag for specific styling
  highlight?: boolean; // Wrap the word in <mark>: it matches the search query
  onClick: (event: React.MouseEvent<HTMLElement>) => void; // Pass the click handler
}

const BookSpan: React.FC<BookSpanProps> = ({
  wordText,
  wordKey,
  convertible = false,
  isSanskrit = false,
  highlight = false,
  onClick,
}) => {
  const displayWord = useDisplayWord();
  // Calculate className based only on props relevant to this specific word
  const className = `
    ${classes.word}
    ${isSanskrit ? classes.sanskritWord : ''}
  `.trim(); // Use trim() to remove leading/trailing whitespace

  // console.log(`Rendering WordSpan: ${wordText.trim()}, isSelected: ${isSelected}`); // Optional: for debugging

  // The trailing space stays outside the mark
  const word = wordText.trimEnd();
  const trailing = wordText.slice(word.length);
  const shown = convertible ? displaySanskrit(displayWord, word) : word;
  // A word shown in another scheme keeps its stored form, which in-page search matches too
  const stored = shown === word ? undefined : { [STORED_TEXT_ATTRIBUTE]: word };
  return (
    <span key={wordKey} onClick={onClick} className={className} {...stored}>
      {highlight ? (
        <>
          <mark>{shown}</mark>
          {trailing}
        </>
      ) : (
        shown + trailing
      )}
    </span>
  );
};

// Memoized: it re-renders when its own props change, and when the scheme does (useDisplayWord)
export default React.memo(BookSpan);
