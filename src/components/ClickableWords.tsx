import React, { useState } from 'react';
import { ActionIcon } from '@mantine/core';
import { IconCopy, IconCopyCheck, IconClipboard, IconClipboardCheck } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';
import classes from './ClickableWords.module.css';
import { WordEntry } from '../types/wordTypes';
import WordInfoPortal from './WordInfoPortal';

interface ClickableWordsProps {
  lines: string[];
  selectedWord: string;
  textTranslit: string;
  setSelectedWord: (word: string) => void;
  selectedDictionaries: string[];
  wordData: WordEntry[];
  isLoadingWordData: boolean;
  onWordClick?: (word: string) => void;
  onAdditionalWordClick?: (word: string) => void;
  setClickedAdditionalWord: (word: string) => void;
  setIsLoadingWordData: (isLoading: boolean) => void;
}

const ClickableWords: React.FC<ClickableWordsProps> = ({
  lines,
  selectedWord,
  setSelectedWord,
  wordData,
  isLoadingWordData,
  setIsLoadingWordData,
  onWordClick,
  onAdditionalWordClick,
  textTranslit,
  setClickedAdditionalWord,
}) => {
  const [clickedElement, setClickedElement] = useState<HTMLElement | null>(null);
  const clipboard = useClipboard({ timeout: 500 });

  const handleWordClick = async (trimmedWord: string, event: React.MouseEvent<HTMLSpanElement>) => {
    setClickedElement(event.currentTarget);
    setSelectedWord(trimmedWord);
    //setIsLoadingWordData(true);
    if (onWordClick) {
      onWordClick(trimmedWord);
    }
  };

  return (
    <>
      {textTranslit !== '' && (
        <ActionIcon
          className={classes.copyButton}
          onClick={() => clipboard.copy(lines.join('\n'))}
          size="md"
          aria-label="Copy text"
        >
          {clipboard.copied ? (
            <IconClipboardCheck className={classes.iconClip} size={20} stroke={1.5} />
          ) : (
            <IconClipboard className={classes.iconClip} size={20} stroke={1.5} />
          )}
        </ActionIcon>
      )}

      <div style={{ marginTop: '4.5rem' }}>
        {lines.map((line, lineIndex) => {
          const words = line.split(/\s+|\+/);
          return (
            <div key={lineIndex} style={{ marginBottom: '8px' }}>
              <p>
                {words.map((word: string, wordIndex: number) => {
                  const trimmedWord = word.trim();
                  return (
                    <span
                      className={`
                          ${classes.word}
                          ${selectedWord === trimmedWord ? classes.selectedWord : ''}
                          `}
                      key={wordIndex}
                      onClick={(e) => handleWordClick(trimmedWord, e)}
                    >
                      {word + ' '}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}
      </div>

      <WordInfoPortal
        clickedElement={clickedElement}
        wordData={wordData}
        isLoadingDebug={isLoadingWordData}
        onAdditionalWordClick={setClickedAdditionalWord}
      />
    </>
  );
};

export default ClickableWords;
