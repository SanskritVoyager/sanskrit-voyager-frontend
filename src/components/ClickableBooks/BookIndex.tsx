import React from 'react';
import { Paper, Title, List, Anchor } from '@mantine/core';
import classes from './ClickableSimpleBooks.module.css';

interface ChapterInfo {
  text: string;
  elementId: string;
  order: number;
}

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
      mb="lg"
      className={classes.bookIndex}
    >
      <span className={classes.indexTitle}>Index</span>
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