import React from 'react';
import { useDisplayWord } from '../../context/TransliterationContext';
import { asStored, displayToken, isSanskritHeading } from '../../utils/displayWord';
import { STORED_TEXT_ATTRIBUTE } from '../../utils/searchMatcher';

interface ShownTextProps {
  text: string;
  /** A heading converts only when it reads as Sanskrit (isSanskritHeading); Sanskrit always does */
  kind: 'heading' | 'sanskrit';
}

/**
 * Book text that is not a clickable word (section headings, the table of
 * contents) in the scheme picked in the navbar. Each converted word keeps its
 * stored form, which in-page search matches too.
 */
export function ShownText({ text, kind }: ShownTextProps) {
  const displayWord = useDisplayWord();
  if (displayWord === asStored || (kind === 'heading' && !isSanskritHeading(text))) {
    return <>{text}</>;
  }
  return (
    <>
      {text.split(/(\s+)/).map((token, index) => {
        const shown = index % 2 === 1 ? token : displayToken(displayWord, token);
        if (shown === token) return token;
        const stored = { [STORED_TEXT_ATTRIBUTE]: token };
        return (
          <span key={index} {...stored}>
            {shown}
          </span>
        );
      })}
    </>
  );
}
