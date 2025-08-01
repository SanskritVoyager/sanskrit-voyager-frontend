import React, { useState } from 'react';
import { Loader } from '@mantine/core';
import { WordEntry, GroupedEntries } from '../../types/wordTypes';
import classes from './WordInfo.module.css';

interface WordInfoProps {
  wordData: WordEntry[];
  onAdditionalWordClick: (word: string) => void;
  isLoading: boolean;
}

function WordInfo({ wordData, onAdditionalWordClick, isLoading }: WordInfoProps): JSX.Element {
  const [localClickedWord, setLocalClickedWord] = useState<string | null>(null);

  const groupEntries = (data: WordEntry[]): GroupedEntries => {
    const groupedEntries: GroupedEntries = {};
    for (const entry of data) {
      let key = '';
      if (entry.length === 7) {
        key = entry[4] || 'default';
      } else if (entry.length === 3) {
        key = entry[0];
      }
      if (!groupedEntries[key]) {
        groupedEntries[key] = [];
      }
      groupedEntries[key].push(entry);
    }
    return groupedEntries;
  };

  const getWordTypeStyle = (entry: WordEntry): string => {
    if (entry.length === 7) {
      // LongEntry
      const grammar = entry[1].toLowerCase();
      if (grammar.includes('verb')) {
        return classes.verbWord;
      }
      if (grammar.includes('indeclinable')) {
        return classes.indeclinableWord;
      }
      if (grammar.includes('pronoun')) {
        return classes.pronounWord;
      }
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className={classes.loaderContainer}>
        <Loader type="dots" size="sm" color="rgba(191, 191, 191, 1)" />
      </div>
    );
  }

  if (wordData.length === 0) {
    return <div className={classes.wordInfoContainer} />;
  }

  const groupedEntries = groupEntries(wordData);

  return (
    <div className={classes.wordInfoContainer}>
      {Object.entries(groupedEntries).map(([etymologyGroup, entries], groupIndex) => {
        const uniqueWords = Array.from(new Set(entries.map((entry) => entry[0])));

        return (
          <div key={groupIndex} className={classes.wordGroup}>
            {uniqueWords.map((word, wordIndex) => {
              const entry = entries.find((e) => e[0] === word);
              const typeClass = entry ? getWordTypeStyle(entry) : '';
              return (
                <span
                  key={`${groupIndex}-${wordIndex}`}
                  className={`${classes.additionalWord} 
                  ${localClickedWord === word ? classes.underlinedWord : ''} 
                  ${typeClass}`}
                  onClick={() => {
                    setLocalClickedWord(word);
                    onAdditionalWordClick(word);
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default WordInfo;
