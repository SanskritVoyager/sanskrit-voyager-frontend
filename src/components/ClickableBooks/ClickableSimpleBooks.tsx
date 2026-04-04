import React, { useState, useEffect, useRef, useCallback } from 'react';
import WordInfoPortal from '../WordInfoPortal';
import classes from './ClickableSimpleBooks.module.css';
import { BookText, TextElement, Metadata } from '../../types/bookTypes';
import MetadataComponent from '../metadata/Metadata';
import { WordEntry } from '../../types/wordTypes';
import { safeSplitText } from './textUtils';
import HighlightText from '../../utils/HighlightText';
import { Accordion } from '@mantine/core';
import { useThrottledCallback, useThrottledState } from '@mantine/hooks';
import ScrollMarkers from './ClickableSimpleMarkers';
import BookSpan from './ClickableSimpleBooksSpan';
import BookIndex from './BookIndex';
import { InPageSearch } from '@/utils/InPageSearchComponent';
import { useInPageSearch } from '@/utils/InPageSearchHook';

interface ClickableSimpleBooksProps {
  bookText: BookText;
  wordData: WordEntry[];
  textType: string;
  isLoadingWordData: boolean;
  targetSegmentNumber: number | null;
  setTargetSegmentNumber: React.Dispatch<React.SetStateAction<number | null>>;
  query: string;
  matchedBookSegments: number[];
  setMatchedBookSegments: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedWord: (word: string) => void;
  setClickedAdditionalWord: (word: string) => void;
  searchMatchedSegments: number[];
  setSearchMatchedSegments: React.Dispatch<React.SetStateAction<number[]>>;
  inPageSearchTrigger?: boolean | undefined;
}

const ClickableSimpleBooks = ({
  bookText,
  setSelectedWord,
  wordData,
  setClickedAdditionalWord,
  textType,
  isLoadingWordData,
  targetSegmentNumber,
  query,
  matchedBookSegments,
  setMatchedBookSegments,
  searchMatchedSegments,
  setSearchMatchedSegments,
  inPageSearchTrigger
}: ClickableSimpleBooksProps) => {
  const [clickedElement, setClickedElement] = useState<HTMLElement | null>(null);
  const highlightedSpanRef = useRef<HTMLElement | null>(null);
  const chapterIdMap = useRef<Map<string, string>>(new Map());
  const foundNotes = useRef<number>(0);


  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  

  
  // Initialize the in-page search hook
  const {
    searchQuery,
    setSearchQuery,
    isSearchVisible,
    setIsSearchVisible,
    currentMatchIndex,
    totalMatches,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch
  } = useInPageSearch({
    containerRef,
    segmentRefs,
    onMatchedSegmentsChange: setSearchMatchedSegments
  });

  // Toggle search when trigger changes (undefined on mount means it won't trigger)
  React.useEffect(() => {
    if (inPageSearchTrigger !== undefined) {
      setIsSearchVisible(prev => !prev);
    }
  }, [inPageSearchTrigger, setIsSearchVisible]);

  // Combine matched segments from different sources
  const combinedMatchedSegments = React.useMemo(() => {
    // console.log('Combining matched segments from advanced search and in-page search');
    // console.log('Matched Book Segments:', matchedBookSegments);
    // console.log('Search Matched Segments:', searchMatchedSegments);

    const combined = new Set([...matchedBookSegments, ...searchMatchedSegments]);
      // console.log('Combined Matched Segments:', Array.from(combined));
    return Array.from(combined);
  }, [matchedBookSegments, searchMatchedSegments]);


  const [initialRenderComplete, setInitialRenderComplete] = useState<boolean>(false);
  const renderCount = useRef(0);
  renderCount.current++;
  // console.log(`ClickableSimpleBooks render #${renderCount.current}`);

  // By using useMemo, the chapters are extracted only when bookText changes.
  const chapters = React.useMemo(() => {
    if (!bookText.body || bookText.body.length === 0) return [];

    const extractedChapters: Array<{ text: string; elementId: string; order: number }> = [];
    const idMap = new Map<string, string>();
    let chapterCount = 0;

    const findChapters = (elements: TextElement[]) => {
      for (const element of elements) {
        if ((element.tag === 'ChapterTitle' || element.tag === 'head') && element.text) {
          const chapterId = `chapter-${chapterCount}`;
          extractedChapters.push({
            text: element.text,
            elementId: chapterId,
            order: chapterCount + 1
          });
          idMap.set(element.text, chapterId);
          chapterCount++;
        }
        if (element.children) {
          findChapters(element.children);
        }
      }
    };

    findChapters(bookText.body);
    chapterIdMap.current = idMap;
    if (extractedChapters.length > 0) {
        // console.log(`Found ${extractedChapters.length} chapters in book`);
    }
    return extractedChapters;
  }, [bookText]);

  useEffect(() => {
    segmentRefs.current = new Map();
    setInitialRenderComplete(false);
    // Don't clear matchedBookSegments here - it's managed by the parent
    // and should persist when opening a book from advanced search
    setSearchMatchedSegments([]);
    foundNotes.current = 0;
    // console.log('Segment refs map and note counter reset due to book change');
  }, [bookText]);

  const scrollToSegment = useCallback(
    (segmentNumber: number) => {
      if (!bookText.body) return;
      // console.log(`Scrolling to segment ${segmentNumber}`);
      const timeoutId = setTimeout(() => {
        const targetElement = segmentRefs.current.get(segmentNumber);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // console.warn(`No ref found for segment ${segmentNumber}`);
          const domElement =
            document.getElementById(`segment-${segmentNumber}`) ||
            document.querySelector(`[data-segment-number="${segmentNumber}"]`);
          if (domElement) {
            domElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    },
    [bookText.body]
  );

  useEffect(() => {
    if (targetSegmentNumber !== null) {
      scrollToSegment(targetSegmentNumber);
    }
  }, [targetSegmentNumber, scrollToSegment]);

  useEffect(() => {
    if (!initialRenderComplete && bookText.body && bookText.body.length > 0) {
      const timer = setTimeout(() => {
        // console.log('Setting initial render complete flag to true.');
        setInitialRenderComplete(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bookText]);

  const handleWordClick = useCallback(
    (e: React.MouseEvent<HTMLElement>, wordToSelect: string) => {
      const currentElement = e.currentTarget;
      setClickedElement(currentElement);
      if (highlightedSpanRef.current && highlightedSpanRef.current !== currentElement) {
        highlightedSpanRef.current.classList.remove(classes.selectedWord);
      }
      currentElement.classList.add(classes.selectedWord);
      highlightedSpanRef.current = currentElement;
      setSelectedWord(wordToSelect);
    },
    [setSelectedWord]
  );

  const blockTags = new Set([
    'div', 'lg', 'l', 'p', 'head', 'pb', 'milestone', 'ab',
    'ChapterTitle', 'Subchapter', 'OpeningTitle',
    'Sutra', 'Commentary', 'LeadingBhashya', 'IntroBhashya', 'Vyakhya',
    'quote', 'trailer', 'homage', 'colophon',
    'table', 'row', 'list', 'item',
    'sp', 'epigraph',
  ]);

  const renderTextElement = (element: TextElement): React.ReactNode => {
    const isBlock = blockTags.has(element.tag);

    const elementClasses = [
      classes[element.tag] || '',
      element.attributes?.rend === 'bold' ? classes.bold : '',
      element.attributes?.rend === 'it' ? classes.italic : '',
      element.attributes?.type ? classes[element.attributes.type] : '',
    ]
      .filter(Boolean)
      .join(' ');

    const segmentNumber = element.segment_number !== undefined ? element.segment_number :
                    (element.attributes?.id ?
                      (parseInt(element.attributes.id.replace('segment-', '')) || null) :
                      null);

    const isTargetSegment =
      segmentNumber !== null &&
      segmentNumber !== undefined &&
      segmentNumber === targetSegmentNumber;

    const isMatchedSegment =
      segmentNumber !== null &&
      segmentNumber !== undefined &&
      matchedBookSegments.includes(segmentNumber);

    const setSegmentRef = (el: HTMLDivElement | null) => {
      if (el && segmentNumber !== null && segmentNumber !== undefined) {
        segmentRefs.current.set(segmentNumber, el);
      }
    };

    const isSeparatorOnlyLine = (text: string) => {
      const trimmed = text.trim();
      return trimmed === '||' || trimmed === '//' || trimmed === '*||*' || trimmed === '*//*';
    };

    const renderWords = (text: string, isTranslation: boolean = false) => {
      if (!text || isSeparatorOnlyLine(text)) {
        return null;
      }
      const transformedText = isTranslation
        ? text
        : text
            .replace(/([A-Za-z]+)_(\d+\.\d+)\s/g, '$2 ')
            .replace(/([A-Za-z]+)_(\d+)/g, '$2 ')
            .replace(/\//g, '|')
            .replace(/\.(?!\d)/g, '|')
            .replace(/\*/g, '');

      const segments = safeSplitText(transformedText);

      return segments.map((segment, segmentIndex) => {
        if (isTranslation) {
          const parts = segment.split(/(<s>.*?<\/s>)/);
          return (
            <span key={segmentIndex} className={classes.textSegment}>
              <span className={classes.textContent}>
                {parts.map((part, partIndex) => {
                  if (part.startsWith('<s>') && part.endsWith('</s>')) {
                    const sanskritWordRaw = part.replace(/<\/?s>/g, '').trim();
                    const sanskritWordProcessed = sanskritWordRaw.toLowerCase();
                    return (
                      <BookSpan
                        key={`${segmentIndex}-${partIndex}`}
                        wordText={sanskritWordRaw + ' '}
                        wordKey={`${segmentIndex}-${partIndex}`}
                        isSanskrit={true}
                        onClick={(e) => handleWordClick(e, sanskritWordProcessed)}
                      />
                    );
                  }
                  return <span key={`${segmentIndex}-${partIndex}`}>{part}</span>;
                })}
                {segmentIndex < segments.length - 1 && <span className={classes.pipeMark}>|</span>}
              </span>
              {segmentIndex < segments.length - 1 && <br />}
            </span>
          );
        } else {
          const words = segment.match(/\|\||\||\+|[^\s+|]+/g) || [];
          return (
            <span key={segmentIndex} className={classes.textSegment}>
              <span className={classes.textContent}>
                {words.map((word: string, wordIndex: number) => {
                  const trimmedWord = word.trim();
                  if (!trimmedWord) return null;
                  // Skip rendering standalone pipes - they're just separators
                  if (trimmedWord === '|' || trimmedWord === '||') return null;
                  return (
                    <BookSpan
                      key={`${segmentIndex}-${wordIndex}`}
                      wordText={word + (wordIndex < words.length - 1 ? ' ' : '')}
                      wordKey={`${segmentIndex}-${wordIndex}`}
                      onClick={(e) => handleWordClick(e, trimmedWord)}
                    />
                  );
                })}
                {segmentIndex < segments.length - 1 && <span className={classes.pipeMark}>|</span>}
              </span>
              {segmentIndex < segments.length - 1 && <br />}
            </span>
          );
        }
      });
    };

    const extractXmlId = (attrs?: Record<string, any>): string | undefined => {
      if (!attrs) return;
      const key = Object.keys(attrs).find(k => /(^id$|}id$)/.test(k));
      const val = key ? attrs[key] : undefined;
      return typeof val === 'string' ? val.trim() : undefined;
    };

    const formatLabelId = (raw?: string): string | undefined =>
      /*raw ? raw.replace(/^[^_]*_/, '') : raw; old pattern, removed a lot */
      raw ? raw.replace(/_/g, ' ') : raw; /* new pattern, just replace underscores with spaces */


    if (element.tag === 'lg') {
      const rawId = extractXmlId(element.attributes);
      if (rawId) {
        const labelText = formatLabelId(rawId);
        return (
          <>
            <div
              className={`
                ${classes.label}
                ${isTargetSegment ? classes.highlightedSegment : ''}
                ${isMatchedSegment ? classes.matchedSegment : ''}
              `}
              data-segment-number={segmentNumber}
              ref={setSegmentRef}
              id={segmentNumber !== null ? `segment-${segmentNumber}` : undefined}
            >
              {labelText}
            </div>
            {element.children?.map((child, childIndex) => (
              <React.Fragment key={`lg-label-child-${childIndex}`}>
                {renderTextElement(child)}
              </React.Fragment>
            ))}
          </>
        );
      }
    }

    if (element.tag === 'note') {
      const noteContent = element.text || '';
      const noteNumber = ++foundNotes.current;
      const noteId = `note-${noteNumber}`;
      return (
        <Accordion
          variant="default"
          radius="md"
          className={classes.noteAccordion}
          classNames={{
            root: classes.noteAccordionRoot,
            panel: classes.noteAccordionPanel,
            item: classes.noteAccordionItem,
            control: classes.noteAccordionControl,
          }}
        >
          <Accordion.Item value={noteId}>
            <Accordion.Control className={classes.noteAccordionControl}>
              <span className={classes.noteNumber}>{noteNumber}</span>
            </Accordion.Control>
            <Accordion.Panel className={classes.noteAccordionPanel}>
              {noteContent && renderWords(noteContent)}
              {element.children?.map((noteChild, noteChildIndex) => (
                <React.Fragment key={`note-child-${noteChildIndex}`}>
                  {renderTextElement(noteChild)}
                </React.Fragment>
              ))}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      );
    }

    if (element.tag === 'pb' || element.tag === 'milestone') {
      let pageText = '';
      const attributes = element.attributes || {};

      if (element.tag === 'pb') {
        let base = '--- Page';
        if (attributes.n) {
          base += ` ${attributes.n}`;
        }
        if (attributes.ed) {
          base += ` (${attributes.ed})`;
        }
        pageText = `${base} ---`;
      } else if (element.tag === 'milestone') {
        const unit = attributes.unit || 'Milestone';
        let n_val = attributes.n || '';
        pageText = `--- ${unit}${n_val ? ' ' + n_val : ''} ---`;
      }

      return (
        <div
          className={`
            ${classes.paragraphContainer}
            ${classes.pageBreak}
            ${elementClasses}
          `}
          data-segment-number={segmentNumber}
          ref={setSegmentRef}
          id={segmentNumber !== null ? `segment-${segmentNumber}` : undefined}
          onClick={() => {
            // console.log('Clicked page/milestone:', attributes.n, attributes.ed, attributes.unit);
          }}
        >
          <div className={classes.pageBreakTextContainer}>{pageText}</div>
          {element.children?.map((child, index) => {
            const childWithType = {
              ...child,
              attributes: {
                ...child.attributes,
                type: child.attributes?.type || element.attributes?.type,
              },
            };
            return <React.Fragment key={index}>{renderTextElement(childWithType)}</React.Fragment>;
          })}
        </div>
      );
    }

    let elementId: string | undefined;
    if ((element.tag === 'ChapterTitle' || element.tag === 'head') && element.text) {
      elementId = chapterIdMap.current.get(element.text);
    } else {
      elementId = segmentNumber !== null ? `segment-${segmentNumber}` : undefined;
    }

    const hasTranslation = !!(element.translated_text && (textType === 'both' || textType === 'tran'));
    const WrapperTag = isBlock || hasTranslation ? 'div' : 'span';
    const TextTag = isBlock ? 'div' : 'span';

    return (
      <>
        {!isBlock && element.text && ' '}
        <span
          className={`
            ${classes.paragraphContainer}
            ${elementClasses}
            ${isTargetSegment ? classes.highlightedSegment : ''}
            ${isMatchedSegment ? classes.matchedSegment : ''}
            `}
          data-segment-number={segmentNumber}
          ref={setSegmentRef}
          id={elementId}
        >
        {element.text && (
          <WrapperTag
            className={`${classes.lineContainer} ${
              textType === 'or'
                ? classes.originalOnly
                : textType === 'tran'
                  ? classes.translationOnly
                  : ''
            }`}
          >
            {(textType === 'both' || textType === 'or') && (
              <TextTag className={`${classes.originalText} ${!isBlock ? classes.originalTextInline : ''}`}>
                {isTargetSegment || isMatchedSegment ? (
                  <HighlightText text={element.text} query={query} />
                ) : (
                  renderWords(element.text)
                )}
              </TextTag>
            )}

            {hasTranslation && (
              <div
                className={`${classes.translatedText} ${
                  textType === 'tran' ? classes.translationOnly : ''
                }`}
              >
                {isTargetSegment || isMatchedSegment ? (
                  <HighlightText text={element.translated_text!} query={query} />
                ) : (
                  renderWords(element.translated_text!, true)
                )}
              </div>
            )}
          </WrapperTag>
        )}

        {element.children?.map((child, index) => {
          const childWithType = {
            ...child,
            attributes: {
              ...child.attributes,
              type: child.attributes?.type || element.attributes?.type,
            },
          };
          if (child.tag === 'note') {
            const noteContent = childWithType.text || '';
            const noteNumber = ++foundNotes.current;
            const noteId = `note-${noteNumber}`;
            return (
              <Accordion
                variant="default"
                radius="md"
                className={classes.noteAccordion}
                key={noteId}
                classNames={{
                  root: classes.noteAccordionRoot,
                  panel: classes.noteAccordionPanel,
                  item: classes.noteAccordionItem,
                  control: classes.noteAccordionControl,
                }}
              >
                <Accordion.Item value={noteId}>
                  <Accordion.Control className={classes.noteAccordionControl}>
                    <span className={classes.noteNumber}>{noteNumber}</span>
                  </Accordion.Control>
                  <Accordion.Panel className={classes.noteAccordionPanel}>
                    {noteContent && renderWords(noteContent)}
                    {childWithType.children?.map((noteChild, noteChildIndex) => (
                      <React.Fragment key={`note-child-${noteChildIndex}`}>
                        {renderTextElement(noteChild)}
                      </React.Fragment>
                    ))}
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            );
          }
          return <React.Fragment key={index}>{renderTextElement(childWithType)}</React.Fragment>;
        })}
      </span>
      {!isBlock && element.text && ' '}
      </>
    );
  };

  const handleChapterClick = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  foundNotes.current = 0;

  // console.log('matchedBookSegments:', matchedBookSegments);
  // console.log(`[Books] Rendering. Passing segmentRefs with size: ${segmentRefs.current.size} to ScrollMarkers.`);

  return (
    <div className={classes.bookContainer} ref={containerRef} style={{ position: 'relative' }}>
      <InPageSearch
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isVisible={isSearchVisible}
        currentMatchIndex={currentMatchIndex}
        totalMatches={totalMatches}
        onClose={() => {
          setIsSearchVisible(false);
          clearSearch();
        }}
        onNext={goToNextMatch}
        onPrevious={goToPreviousMatch}
      />
      
      
      
      
      
      {bookText.metadata && <MetadataComponent metadata={bookText.metadata} />}
      {chapters.length > 0 && (
        <BookIndex
          chapters={chapters}
          onChapterClick={handleChapterClick}
        />
      )}
      <div
        className={`${classes.textContent} ${
          textType === 'or'
            ? classes.originalOnly
            : textType === 'tran'
              ? classes.translationOnly
              : ''
        }`}
      >
        {bookText.body?.map((element, index) => (
          <React.Fragment key={index}>
            {renderTextElement(element)}
            {['lg', 'p', 'pb', 'l'].includes(element.tag) && <br />}
          </React.Fragment>
        ))}
      </div>
      {combinedMatchedSegments.length > 0 && (
        <ScrollMarkers
          containerRef={containerRef}
          segmentRefs={segmentRefs}
          matchedBookSegments={combinedMatchedSegments}
          activeSegment={targetSegmentNumber}
          onSegmentClick={scrollToSegment}
          initialRenderComplete={initialRenderComplete}
          // Optional: Pass flag to style search matches differently
          searchMatchedSegments={searchMatchedSegments}
        />
      )}
      <WordInfoPortal
        clickedElement={clickedElement}
        wordData={wordData}
        isLoadingDebug={isLoadingWordData}
        onAdditionalWordClick={setClickedAdditionalWord}
      />
    </div>
  );
};

export default React.memo(ClickableSimpleBooks);