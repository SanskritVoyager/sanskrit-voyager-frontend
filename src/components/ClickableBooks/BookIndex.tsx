import React from 'react';
import { Paper, List, Anchor } from '@mantine/core';
import classes from './ClickableSimpleBooks.module.css';
import { ShownText } from './ShownText';

export interface ChapterInfo {
  text: string;
  /** The heading's translated_text as stored: Sanskrit terms marked with <s>…</s> */
  translation?: string;
  elementId: string;
  order: number;
}

// Indexes longer than this scroll inside the panel instead of pushing the text down.
const LONG_INDEX_THRESHOLD = 40;

// A leading chapter number: "17 ", "17. ", "3.1. ", "१. "
const LEADING_NUMBER = /^\s*[0-9०-९]+(?:\.[0-9०-९]+)*\.?\s+/;

/** Text reduced for comparison: no markup, number, trailing punctuation or case; Devanagari digits as ASCII */
const comparable = (text: string) =>
  text
    .replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966))
    .replace(/<\/?s>/g, '')
    .replace(LEADING_NUMBER, '')
    .replace(/[\s.,;:|/।॥]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** The translation worth showing beside the title, or null when it only repeats it */
const displayedTranslation = (chapter: ChapterInfo): string | null => {
  const translation = chapter.translation?.trim();
  if (!translation || comparable(translation) === comparable(chapter.text)) return null;
  // The title already carries the chapter number; don't show it twice
  return LEADING_NUMBER.test(chapter.text) ? translation.replace(LEADING_NUMBER, '') : translation;
};

/** Translation text with its <s>…</s> Sanskrit terms set apart (not clickable: the entry is a button) */
const renderTranslation = (translation: string) =>
  translation.split(/(<s>.*?<\/s>)/).map((part, index) =>
    part.startsWith('<s>') && part.endsWith('</s>') ? (
      <span key={index} className={classes.indexSanskritTerm}>
        <ShownText text={part.slice(3, -4)} kind="sanskrit" />
      </span>
    ) : (
      part.replace(/<\/?s>/g, '')
    )
  );

interface BookIndexProps {
  chapters: ChapterInfo[];
  /** Reader text mode: 'or' original only, 'tran' translation only, 'both' */
  textType: string;
  onChapterClick: (elementId: string) => void;
}

const BookIndex: React.FC<BookIndexProps> = ({ chapters, textType, onChapterClick }) => {
  if (chapters.length === 0) {
    return null;
  }

  return (
    <Paper
      shadow="xs"
      p="md"
      pb={'lg'}
      className={`${classes.bookIndex} ${chapters.length > LONG_INDEX_THRESHOLD ? classes.bookIndexScrollable : ''}`}
    >
     <span className={classes.indexTitle}>Table of Contents</span>
      <List type="ordered">
        {chapters.map((chapter) => {
          const translation = textType === 'or' ? null : displayedTranslation(chapter);
          // In translation-only mode the translation leads and the original follows
          const translationFirst = textType === 'tran' && translation !== null;
          return (
            <List.Item key={chapter.elementId}>
              <Anchor
                component="button"
                onClick={() => onChapterClick(chapter.elementId)}
                className={classes.indexLink}
              >
                {/* One span per line: the entry is a column flexbox and aligns its list number with the first */}
                <span>
                  {translationFirst ? (
                    renderTranslation(translation)
                  ) : (
                    <ShownText text={chapter.text} kind="heading" />
                  )}
                </span>
                {translation !== null && (
                  <span className={classes.indexSubtitle}>
                    {translationFirst ? (
                      <ShownText text={chapter.text} kind="heading" />
                    ) : (
                      renderTranslation(translation)
                    )}
                  </span>
                )}
              </Anchor>
            </List.Item>
          );
        })}
      </List>
    </Paper>
  );
};

export default React.memo(BookIndex);
