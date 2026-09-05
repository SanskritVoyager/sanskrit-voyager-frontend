import React from 'react';
import { Paper, Title, List, Anchor } from '@mantine/core';
import classes from './ClickableSimpleBooks.module.css';

interface ChapterInfo {
  text: string;
  elementId: string;
  order: number;
}

// Indexes longer than this scroll inside the panel instead of pushing the text down.
const LONG_INDEX_THRESHOLD = 40;

interface BookIndexProps {
  chapters: ChapterInfo[];
  onChapterClick: (elementId: string) => void;
}

const BookIndex: React.FC<BookIndexProps> = ({ chapters, onChapterClick }) => {
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
        {chapters.map((chapter) => (
          <List.Item key={chapter.elementId}>
            <Anchor
              component="button"
              onClick={() => onChapterClick(chapter.elementId)}
              className={classes.indexLink}
            >
              {chapter.text}
            </Anchor>
          </List.Item>
        ))}
      </List>
    </Paper>
  );
};

export default React.memo(BookIndex);