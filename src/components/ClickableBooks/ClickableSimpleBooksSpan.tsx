import React from 'react';
import classes from './ClickableSimpleBooks.module.css'; // Reuse styles if applicable

interface BookSpanProps {
  wordText: string; // The text to display (e.g., "word ")
  wordKey: string; // Unique key for React
  isSanskrit?: boolean; // Optional flag for specific styling
  highlight?: boolean; // Wrap the word in <mark>: it matches the search query
  onClick: (event: React.MouseEvent<HTMLElement>) => void; // Pass the click handler
}

const BookSpan: React.FC<BookSpanProps> = ({
  wordText,
  wordKey,
  isSanskrit = false,
  highlight = false,
  onClick,
}) => {
  // Calculate className based only on props relevant to this specific word
  const className = `
    ${classes.word}
    ${isSanskrit ? classes.sanskritWord : ''}
  `.trim(); // Use trim() to remove leading/trailing whitespace

  // console.log(`Rendering WordSpan: ${wordText.trim()}, isSelected: ${isSelected}`); // Optional: for debugging

  // The trailing space stays outside the mark
  const word = wordText.trimEnd();
  return (
    <span key={wordKey} onClick={onClick} className={className}>
      {highlight ? (
        <>
          <mark>{word}</mark>
          {wordText.slice(word.length)}
        </>
      ) : (
        wordText
      )}
    </span>
  );
};

// Memoize the component: It will only re-render if its own props change.
export default React.memo(BookSpan);
