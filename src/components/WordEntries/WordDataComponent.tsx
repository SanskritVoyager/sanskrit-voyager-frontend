import React, { memo } from 'react';
import InflectionTable from './InflectionTable';
import { fetchWordData } from '../../utils/Api';
import { useState, useEffect } from 'react';
import DictionaryEntry from './DictionaryEntry';
import { Text, Divider, Title, Tooltip, ActionIcon } from '@mantine/core';
import { IconTable, IconTableOff, IconBorderAll, IconTablePlus } from '@tabler/icons-react';

import classes from './WordDataComponent.module.css';

// Define types for the different entry structures
type InflectionEntry = [string, string]; // [caseAbbr, numberAbbr]
type LongEntry = [
  string, // entry[0] - word
  string, // entry[1] - grammar
  InflectionEntry[], // entry[2] - inflections
  string[], // entry[3] - inflection_wordsIAST
  string, // entry[4] - derivarion
  string, // entry[5] - pronunciation
  { [dictionaryName: string]: { [wordName: string]: string[] } }, // entry[6] - vocabulary entries
];

type ShortEntry = [
  string, // entry[0] - word
  string, // entry[1] - unknown/unused
  { [dictionaryName: string]: { [wordName: string]: string[] } }, // entry[6] - vocabulary entries
];

type WordEntry = LongEntry | ShortEntry;

interface WordDataComponentProps {
  selectedDictionaries: string[];
  wordData: WordEntry[];
  setWordData: React.Dispatch<React.SetStateAction<WordEntry[]>>;
  isMobile: boolean | undefined;
  isTablet: boolean | undefined;
  isNavabarVisible: boolean;
  displayInflectionTables: boolean;
  setDisplayInflectionTables: (value: boolean) => void;
}

type DictionaryLabels = {
  [key: string]: string;
};

const dictionaryLabels: DictionaryLabels = {
  mw: 'Monier-Williams Sanskrit-English',
  ap90: 'Apte Practical Sanskrit-English',
  ddsa: 'Macdonell A Practical Sanskrit',
  cped: 'Concise Pali English Dictionary',
  gra: 'Grassmann Wörterbuch zum Rig Veda',
  bhs: 'Edgerton Buddhist Hybrid Sanskrit',
  cae: 'Cappeller Sanskrit-English',
  armh: 'Abhidhānaratnamālā of Halāyudha',
  abch: 'Abhidhānacintāmaṇi of Hemacandrācārya',
};

const WordDataComponent = ({
  wordData,
  setWordData,
  isMobile,
  selectedDictionaries,
  isTablet,
  isNavabarVisible,
  setDisplayInflectionTables,
  displayInflectionTables,
}: WordDataComponentProps) => {
  const handleWordClick = async (word: string, index: number) => {
    fetchWordData(word)
      .then((data) => {
        if (data && data.length > 0) {
          setWordData((prevWordData) => {
            // Calculate insertion position (right after the clicked word)
            const insertPosition = index + 1;

            // Store the new word to scroll to
            const newWordToScrollTo = data[0][0]; // First word of first entry

            // Create new data array with inserted entries
            const newData = [...prevWordData];
            newData.splice(insertPosition, 0, ...data);

            // Use setTimeout to allow React to render the DOM updates
            setTimeout(() => {
              // Find the element by attribute instead of class
              const newWordElement = document.querySelector(`[data-word="${newWordToScrollTo}"]`);

              if (newWordElement) {
                newWordElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              } else {
                console.log('Could not find new word element:', newWordToScrollTo);
              }
            }, 150); // Increase timeout to ensure rendering completes

            return newData;
          });
        }
      })
      .catch((err) => {
        console.error('Error fetching word data:', err);
      });
  };

  // Function to check if the word has appeared before in the list
  const hasWordAppearedBefore = (currentWord: string, currentIndex: number) => {
    return wordData.some((entry, index) => index < currentIndex && entry[0] === currentWord);
  };

  return (
    <>
      {wordData &&
        wordData.map((entry, index) => {
          console.log(entry[2]);
          if (entry.length === 7) {
            const longEntry = entry as LongEntry;
            const shouldShowVocabulary = !hasWordAppearedBefore(longEntry[0], index);

            // Process dictionary entries, filtering out empty dictionaries
            const processedDictionaries = Object.entries(longEntry[6]).filter(([_, words]) =>
              Object.entries(words).some(([_, entries]) => entries.length > 0)
            );

            return (
              // title first
              <div key={index}>
                <Title order={1} className={classes.mainWord} data-word={longEntry[0]}>
                  {longEntry[0]}
                </Title>

                {longEntry[0] !== longEntry[5] && ( // word components si può rimuovere il p outer?
                  <p className={classes.wordCostituentsContainer}>
                    {(longEntry[5] ? longEntry[5].split(/(-|—(?=\p{L}))/u) : []).map(
                      (part, index) => {
                        if (!part.trim()) return part;

                        return (
                          <span
                            key={`pron-${index}`}
                            onClick={() => handleWordClick(part, index)}
                            className={classes.pronunciation}
                          >
                            {part}
                          </span>
                        );
                      }
                    )}
                  </p>
                )}

                {longEntry[0] !== longEntry[4] && (
                  <div className={classes.etymologySection}>
                    <span className={classes.etymologyLabel}>from:</span>
                    <span className={classes.etymologyTerm}>{longEntry[4]}</span>
                  </div>
                )}

                <div className={classes.grammarSection}>
                  <div
                    className={
                      longEntry[1] === 'indeclinable (avyaya)'
                        ? classes.grammarMainIndeclinable
                        : classes.grammarMain
                    }
                  >
                    <span>{longEntry[1]}</span>

                    {longEntry[1] !== 'indeclinable (avyaya)' && (
                      <Tooltip label={displayInflectionTables ? 'Hide table' : 'Show table'}>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={() => setDisplayInflectionTables(!displayInflectionTables)}
                          className={classes.inflectionTableIcon}
                        >
                          {displayInflectionTables ? (
                            <IconTableOff size={16} stroke={1.5} />
                          ) : (
                            <IconTablePlus size={16} stroke={1.5} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </div>

                  {longEntry[2] &&
                    longEntry[2].map((inflection, index) => {
                      let caseAbbr = inflection[0];
                      let numberAbbr = inflection[1];

                      let caseFull;
                      switch (caseAbbr.trim()) {
                        case 'Nom':
                          caseFull = 'Nominative';
                          break;
                        case 'Acc':
                          caseFull = 'Accusative';
                          break;
                        case 'Voc':
                          caseFull = 'Vocative';
                          break;
                        case 'Inst':
                          caseFull = 'Instrumental';
                          break;
                        case 'Dat':
                          caseFull = 'Dative';
                          break;
                        case 'Abl':
                          caseFull = 'Ablative';
                          break;
                        case 'Gen':
                          caseFull = 'Genitive';
                          break;
                        case 'Loc':
                          caseFull = 'Locative';
                          break;
                        default:
                          caseFull = caseAbbr;
                      }

                      let numberFull;
                      switch (numberAbbr.trim()) {
                        case 'Sg':
                          numberFull = 'Singular';
                          break;
                        case 'Du':
                          numberFull = 'Dual';
                          break;
                        case 'Pl':
                          numberFull = 'Plural';
                          break;
                        default:
                          numberFull = numberAbbr;
                      }

                      return (
                        <span
                          key={index}
                          className={
                            caseFull && numberFull
                              ? classes.grammarDetail
                              : classes.grammarDetailEmpty
                          }
                        >
                          {longEntry[3].length > 1 && (
                            <>
                              {caseFull}, {numberFull}
                              {index < longEntry[2].length - 1 && ' or '}
                            </>
                          )}
                        </span>
                      );
                    })}

                  {displayInflectionTables && (
                    <InflectionTable
                      inflection_wordsIAST={longEntry[3]}
                      rowcolstitles={longEntry[2]}
                      useColor={true}
                    />
                  )}
                </div>

                {shouldShowVocabulary && (
                  <div className={classes.vocabularyWrapper}>
                    <div>
                      {processedDictionaries.map(([dictionaryName, words]) => (
                        <div key={dictionaryName}>
                          {/* Render dictionary name */}
                          {(processedDictionaries.length > 1 ||
                            (!selectedDictionaries.includes(dictionaryName) &&
                              !(dictionaryName === 'mw' && selectedDictionaries.length === 0))) && (
                            <Text className={classes.dictName}>
                              {dictionaryLabels[dictionaryName] || dictionaryName}:
                            </Text>
                          )}
                          {Object.entries(words).map(([wordName, entries]) => (
                            <div
                              key={wordName}
                              style={{
                                paddingTop: '1.25rem',
                              }}
                            >
                              {/* Render word name 
                            <div 
                              className={classes.wordName}
                            >
                              {wordName}:
                              </div>
                             Render each entry for the word */}
                              {Array.isArray(entries)
                                ? entries.map((entry, index) => (
                                    <DictionaryEntry
                                      key={`${dictionaryName}-${wordName}-${index}`}
                                      entry={entry}
                                      onWordClick={handleWordClick}
                                    />
                                  ))
                                : null}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* </hr> */}
              </div>
            );
          } else if (entry.length === 3) {
            const shortEntry = entry as ShortEntry;
            const shouldShowVocabulary = !hasWordAppearedBefore(shortEntry[0], index);

            // Process dictionary entries, filtering out empty dictionaries
            const processedDictionaries = Object.entries(shortEntry[2]).filter(([_, words]) =>
              Object.entries(words).some(([_, entries]) => entries.length > 0)
            );

            return (
              <div
                style={{
                  wordBreak: 'break-word', // Added to ensure words break
                  whiteSpace: 'normal', // Changed from pre-wrap
                }}
              >
                <Title order={1} className={classes.mainWord} data-word={shortEntry[0]}>
                  {shortEntry[0]}
                </Title>

                {shortEntry[0] !== shortEntry[1] && ( // word components
                  <p className={classes.wordCostituentsContainerShort}>
                    {(shortEntry[1] ? shortEntry[1].split(/(-|—(?=\p{L}))/u) : []).map(
                      (part, index) => {
                        if (!part.trim()) return part;

                        return (
                          <span
                            key={`pron-${index}`}
                            onClick={() => handleWordClick(part, index)}
                            className={classes.pronunciation}
                          >
                            {part}
                          </span>
                        );
                      }
                    )}
                  </p>
                )}

                {shouldShowVocabulary && (
                  <div className={classes.vocabularyWrapper}>
                    {Object.entries(shortEntry[2]).map(([dictionaryName, words]) => (
                      <div key={dictionaryName}>
                        {/* Render dictionary name */}
                        {(processedDictionaries.length > 1 ||
                          (!selectedDictionaries.includes(dictionaryName) &&
                            !(dictionaryName === 'mw' && selectedDictionaries.length === 0))) && (
                          <Text className={classes.dictName}>
                            {dictionaryLabels[dictionaryName] || dictionaryName}:
                          </Text>
                        )}

                        {Object.entries(words).map(([wordName, entries]) => (
                          <div
                            key={wordName}
                            style={{
                              paddingTop: '1rem',
                            }}
                          >
                            {/* Render word name 
                        <div 
                          className={classes.wordName}
                        >{wordName}</div>
                           Render each entry for the word */}

                            {Array.isArray(entries)
                              ? entries
                                  .filter((entry) => entry && Object.keys(entry).length > 0) // Filter out empty strings and empty objects
                                  .map((entry, index) => (
                                    <DictionaryEntry
                                      key={`${dictionaryName}-${wordName}-${index}`}
                                      entry={entry}
                                      onWordClick={handleWordClick}
                                    />
                                  ))
                              : null}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          } else {
            return null;
          }
        })}
    </>
  );
};

export default React.memo(WordDataComponent);
