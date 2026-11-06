import React, { useState, useEffect, useRef, useCallback } from 'react';
import WordInfoPortal from '../WordInfoPortal';
import classes from './ClickableSimpleBooks.module.css';
import { BookText, TextElement, Metadata } from '../../types/bookTypes';
import MetadataComponent from '../metadata/Metadata';
import { WordEntry } from '../../types/wordTypes';
import {
  safeSplitText,
  normalizeOriginalText,
  toDandas,
  isDandaToken,
  isVerseRefToken,
} from './textUtils';
import { findMatchRanges } from '../../utils/searchMatcher';
import { Accordion } from '@mantine/core';
import { useThrottledCallback, useThrottledState } from '@mantine/hooks';
import ScrollMarkers from './ClickableSimpleMarkers';
import BookSpan from './ClickableSimpleBooksSpan';
import BookIndex, { ChapterInfo } from './BookIndex';
import { BookSectionHeading } from './BookSectionHeading';
import { InPageSearch } from '@/utils/InPageSearchComponent';
import { useInPageSearch } from '@/utils/InPageSearchHook';
import { useDisplayWord } from '../../context/TransliterationContext';
import { isSanskritHeading, looksLikeEnglish } from '../../utils/displayWord';
import { ShownText } from './ShownText';

/**
 * Which original text is shown in the navbar's scheme: running text unless it
 * reads as English, headings only when they read as Sanskrit (most are
 * English: "Chapter 3"), and notes never (sigla and editors' abbreviations).
 */
type Conversion = 'text' | 'heading' | 'none';
const HEADING_TAGS = new Set(['head', 'ChapterTitle', 'Subchapter', 'OpeningTitle']);

const blockTags = new Set([
  'div', 'lg', 'l', 'p', 'head', 'pb', 'milestone', 'ab',
  'ChapterTitle', 'Subchapter', 'OpeningTitle', 'opener',
  'Sutra', 'Commentary', 'LeadingBhashya', 'IntroBhashya', 'Vyakhya',
  'quote', 'trailer', 'homage', 'colophon',
  'table', 'row', 'list', 'item',
  'sp', 'epigraph',
]);

const extractXmlId = (attrs?: Record<string, any>): string | undefined => {
  if (!attrs) return;
  const key = Object.keys(attrs).find(k => /(^id$|}id$)/.test(k));
  const val = key ? attrs[key] : undefined;
  return typeof val === 'string' ? val.trim() : undefined;
};

const formatLabelId = (raw?: string): string | undefined =>
  raw ? raw.replace(/_/g, ' ') : raw;

const isEmptyLabelledLg = (el: TextElement): string | undefined => {
  if (el.tag !== 'lg') return;
  const rawId = extractXmlId(el.attributes);
  if (!rawId) return;
  const hasNoText = !el.text || !el.text.trim();
  const hasNoChildren = !el.children || el.children.length === 0;
  return hasNoText && hasNoChildren ? rawId : undefined;
};

/** A text element with its footnote number assigned once per book, in render order */
type NumberedElement = Omit<TextElement, 'children'> & {
  noteNumber?: number;
  children?: NumberedElement[];
};

const annotateNotes = (elements: TextElement[]): NumberedElement[] => {
  let count = 0;
  const walk = (list: TextElement[]): NumberedElement[] =>
    list.map((element) => {
      const copy: NumberedElement = { ...element, children: undefined };
      if (element.tag === 'note') {
        count += 1;
        copy.noteNumber = count;
      }
      if (element.children) copy.children = walk(element.children);
      return copy;
    });
  return walk(elements);
};

const segmentNumberOf = (element: TextElement): number | null => {
  if (element.segment_number !== undefined) return element.segment_number;
  if (element.attributes?.id) {
    return parseInt(element.attributes.id.replace('segment-', ''), 10) || null;
  }
  return null;
};

/** Every segment number inside an element, so a segment can tell whether a change concerns it */
const collectSegmentNumbers = (element: TextElement, into: number[] = []): number[] => {
  const number = segmentNumberOf(element);
  if (number !== null) into.push(number);
  element.children?.forEach((child) => collectSegmentNumbers(child, into));
  return into;
};

const isMarked = (word: string, query: string) =>
  query !== '' && findMatchRanges(word, query, { separateWords: true }).length > 0;

/** Plain text with the query's words wrapped in <mark>, as the search results show them */
const markMatches = (text: string, query: string): React.ReactNode => {
  if (!query) return text;
  const ranges = findMatchRanges(text, query, { separateWords: true });
  if (!ranges.length) return text;
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end]) => {
    if (start > cursor) pieces.push(text.slice(cursor, start));
    pieces.push(<mark key={start}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return pieces;
};

/** A top-level element of the body, with the label an empty <lg> before it may carry */
interface BookItem {
  key: number;
  element: NumberedElement;
  labelId?: string;
  labelSegmentNumber: number | null;
  segments: number[];
}

const buildItems = (body: NumberedElement[]): BookItem[] => {
  const items: BookItem[] = [];
  for (let i = 0; i < body.length; i += 1) {
    const element = body[i];
    const labelId = isEmptyLabelledLg(element);
    const next = body[i + 1];
    if (labelId && next) {
      // Empty <lg> carrying only a label: the next sibling becomes the labelled
      // content so the label aligns to that block's first line
      const labelSegmentNumber = element.segment_number ?? null;
      const segments = collectSegmentNumbers(next);
      if (labelSegmentNumber !== null) segments.push(labelSegmentNumber);
      items.push({ key: i, element: next, labelId, labelSegmentNumber, segments });
      i += 1; // consumed `next`
    } else {
      items.push({
        key: i,
        element,
        labelSegmentNumber: null,
        segments: collectSegmentNumbers(element),
      });
    }
  }
  return items;
};

interface BookSegmentProps {
  element: NumberedElement;
  labelId?: string;
  labelSegmentNumber: number | null;
  textType: string;
  /** The target segment, or null when it is not inside this element */
  targetSegmentNumber: number | null;
  /** Matched segment numbers inside this element, joined with commas (stable for memo) */
  matchedKey: string;
  /** The search query to mark, or '' when nothing inside is target or matched */
  highlightQuery: string;
  chapterIds: Map<string, string>;
  segmentRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  handleWordClick: (e: React.MouseEvent<HTMLElement>, word: string) => void;
}

// One top-level element of the text. Memoized, so a change of target, matched
// segments or query re-renders only the segments it concerns rather than the
// whole text.
const BookSegment = React.memo(function BookSegment({
  element,
  labelId,
  labelSegmentNumber,
  textType,
  targetSegmentNumber,
  matchedKey,
  highlightQuery,
  chapterIds,
  segmentRefs,
  handleWordClick,
}: BookSegmentProps) {
  const matchedSegments = React.useMemo(
    () => new Set(matchedKey ? matchedKey.split(',').map(Number) : []),
    [matchedKey]
  );
  const renderTextElement = (element: NumberedElement, inNote = false): React.ReactNode => {
    const isBlock = blockTags.has(element.tag);
    const sectionHeading = BookSectionHeading.fromElement(element);
    const conversion: Conversion = inNote
      ? 'none'
      : HEADING_TAGS.has(element.tag)
        ? 'heading'
        : 'text';

    const elementClasses = [
      classes[element.tag] || '',
      element.attributes?.rend === 'bold' ? classes.bold : '',
      element.attributes?.rend === 'it' ? classes.italic : '',
      // Types vary in case across sources (Adhyāya / adhyāya), so match CSS on the lowercase form
      element.attributes?.type ? classes[element.attributes.type.toLowerCase()] : '',
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
      matchedSegments.has(segmentNumber);

    const setSegmentRef = (el: HTMLDivElement | null) => {
      if (el && segmentNumber !== null && segmentNumber !== undefined) {
        segmentRefs.current.set(segmentNumber, el);
      }
    };

    const isSeparatorOnlyLine = (text: string) => {
      const trimmed = text.trim();
      return trimmed === '||' || trimmed === '//' || trimmed === '*||*' || trimmed === '*//*';
    };

    // Words of a target or matched segment carry <mark> where they match the query
    const wordHighlight = isTargetSegment || isMatchedSegment ? highlightQuery : '';

    const renderWords = (
      text: string,
      isTranslation: boolean = false,
      wordConversion: Conversion = conversion
    ) => {
      if (!text || isSeparatorOnlyLine(text)) {
        return null;
      }
      const transformedText = isTranslation ? text : normalizeOriginalText(text);

      // Whether the words may be shown in the navbar's scheme, decided on the whole
      // text (a translation's <s> words are Sanskrit by markup). Each BookSpan reads
      // the scheme itself and keeps the stored word for clicks, matches and marks.
      const convertible = isTranslation
        ? wordConversion !== 'none'
        : wordConversion === 'text'
          ? !looksLikeEnglish(text)
          : wordConversion === 'heading' && isSanskritHeading(text);

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
                        convertible={convertible}
                        wordKey={`${segmentIndex}-${partIndex}`}
                        isSanskrit={true}
                        highlight={isMarked(sanskritWordRaw, wordHighlight)}
                        onClick={(e) => handleWordClick(e, sanskritWordProcessed)}
                      />
                    );
                  }
                  return <span key={`${segmentIndex}-${partIndex}`}>{markMatches(part, wordHighlight)}</span>;
                })}
                {segmentIndex < segments.length - 1 && <span className={classes.pipeMark}>|</span>}
              </span>
              {segmentIndex < segments.length - 1 && <br />}
            </span>
          );
        } else {
          const words = segment.match(/\|\||\||\+|[^\s+|]+/g) || [];
          const lastWord = words.length > 0 ? words[words.length - 1].trim() : '';
          // A line break inside the text gets a danda, unless the line already ends with one
          const needsLineDanda = segmentIndex < segments.length - 1 && !isDandaToken(lastWord);
          return (
            <span key={segmentIndex} className={classes.textSegment}>
              <span className={classes.textContent}>
                {words.map((word: string, wordIndex: number) => {
                  const trimmedWord = word.trim();
                  if (!trimmedWord) return null;
                  const trailingSpace = wordIndex < words.length - 1 ? ' ' : '';
                  // Dandas are punctuation: rendered, but not clickable
                  if (isDandaToken(trimmedWord)) {
                    return (
                      <span key={`${segmentIndex}-${wordIndex}`} className={classes.danda}>
                        {toDandas(trimmedWord)}
                        {trailingSpace}
                      </span>
                    );
                  }
                  // A bare number next to a danda is a verse reference (|| 1,1.1 ||), not a word
                  const nextToDanda =
                    (wordIndex > 0 && isDandaToken(words[wordIndex - 1].trim())) ||
                    (wordIndex < words.length - 1 && isDandaToken(words[wordIndex + 1].trim()));
                  if (nextToDanda && isVerseRefToken(trimmedWord)) {
                    return (
                      <span key={`${segmentIndex}-${wordIndex}`} className={classes.verseRef}>
                        {trimmedWord}
                        {trailingSpace}
                      </span>
                    );
                  }
                  return (
                    <BookSpan
                      key={`${segmentIndex}-${wordIndex}`}
                      wordText={word + trailingSpace}
                      convertible={convertible}
                      wordKey={`${segmentIndex}-${wordIndex}`}
                      highlight={isMarked(trimmedWord, wordHighlight)}
                      onClick={(e) => handleWordClick(e, trimmedWord)}
                    />
                  );
                })}
                {needsLineDanda && <span className={classes.danda}>।</span>}
              </span>
              {segmentIndex < segments.length - 1 && <br />}
            </span>
          );
        }
      });
    };

    if (element.tag === 'lg') {
      const rawId = extractXmlId(element.attributes);
      if (rawId) {
        const labelText = formatLabelId(rawId);
        return (
          <div
            className={`
              ${classes.paragraphContainer}
              ${classes.lg}
              ${classes.labeledLg}
              ${isTargetSegment ? classes.highlightedSegment : ''}
              ${isMatchedSegment ? classes.matchedSegment : ''}
            `}
            data-segment-number={segmentNumber}
            ref={setSegmentRef}
            id={segmentNumber !== null ? `segment-${segmentNumber}` : undefined}
          >
            <div className={classes.label}>{labelText}</div>
            {element.children?.map((child, childIndex) => (
              <React.Fragment key={`lg-label-child-${childIndex}`}>
                {renderTextElement(child, inNote)}
              </React.Fragment>
            ))}
          </div>
        );
      }
    }

    if (element.tag === 'note') {
      const noteContent = element.text || '';
      const noteNumber = element.noteNumber ?? 0;
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
              {noteContent && renderWords(noteContent, false, 'none')}
              {element.children?.map((noteChild, noteChildIndex) => (
                <React.Fragment key={`note-child-${noteChildIndex}`}>
                  {renderTextElement(noteChild, true)}
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
            return (
              <React.Fragment key={index}>
                {renderTextElement(childWithType, inNote)}
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    let elementId: string | undefined;
    if ((element.tag === 'ChapterTitle' || element.tag === 'head') && element.text) {
      elementId = chapterIds.get(element.text);
    } else {
      elementId = segmentNumber !== null ? `segment-${segmentNumber}` : undefined;
    }

    const hasTranslation = !!(element.translated_text && (textType === 'both' || textType === 'tran'));
    const WrapperTag = isBlock || hasTranslation ? 'div' : 'span';
    const TextTag = isBlock ? 'div' : 'span';
    const ContainerTag = sectionHeading ? 'div' : 'span';

    return (
      <>
        {!isBlock && element.text && ' '}
        <ContainerTag
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
        {sectionHeading && (
          <h2 id={sectionHeading.elementId} className={`${classes.head} ${classes.sectionHeading}`}>
            <ShownText text={sectionHeading.text} kind="heading" />
          </h2>
        )}
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
                {renderWords(element.text)}
              </TextTag>
            )}

            {hasTranslation && (
              <div
                className={`${classes.translatedText} ${
                  textType === 'tran' ? classes.translationOnly : ''
                }`}
              >
                {renderWords(element.translated_text!, true)}
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
            const noteNumber = childWithType.noteNumber ?? 0;
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
                    {noteContent && renderWords(noteContent, false, 'none')}
                    {childWithType.children?.map((noteChild, noteChildIndex) => (
                      <React.Fragment key={`note-child-${noteChildIndex}`}>
                        {renderTextElement(noteChild, true)}
                      </React.Fragment>
                    ))}
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            );
          }
          return (
            <React.Fragment key={index}>
              {renderTextElement(childWithType, inNote)}
            </React.Fragment>
          );
        })}
      </ContainerTag>
      {!isBlock && element.text && ' '}
      </>
    );
  };

  if (labelId) {
    const isTarget = labelSegmentNumber !== null && labelSegmentNumber === targetSegmentNumber;
    const isMatched = labelSegmentNumber !== null && matchedSegments.has(labelSegmentNumber);
    return (
      <div
        className={`
          ${classes.paragraphContainer}
          ${classes.labeledLg}
          ${isTarget ? classes.highlightedSegment : ''}
          ${isMatched ? classes.matchedSegment : ''}
        `}
        data-segment-number={labelSegmentNumber}
        ref={(node) => {
          if (node && labelSegmentNumber !== null) {
            segmentRefs.current.set(labelSegmentNumber, node);
          }
        }}
        id={labelSegmentNumber !== null ? `segment-${labelSegmentNumber}` : undefined}
      >
        <div className={classes.label}>{formatLabelId(labelId)}</div>
        {renderTextElement(element)}
      </div>
    );
  }

  return <>{renderTextElement(element)}</>;
});

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


  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  

  
  // The scheme the words are shown in (navbar); a switch redraws every word
  const displayWord = useDisplayWord();

  // Everything that changes the rendered text; an open in-page search runs again when it does.
  // In-page search results must stay out of it, or reporting them would re-run the search.
  const searchContentKey = React.useMemo(
    () => [bookText, textType, targetSegmentNumber, matchedBookSegments, query, displayWord],
    [bookText, textType, targetSegmentNumber, matchedBookSegments, query, displayWord]
  );

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
    onMatchedSegmentsChange: setSearchMatchedSegments,
    contentKey: searchContentKey,
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

    const extractedChapters: ChapterInfo[] = [];
    const idMap = new Map<string, string>();
    let chapterCount = 0;

    const findChapters = (elements: TextElement[]) => {
      for (const element of elements) {
        const sectionHeading = BookSectionHeading.fromElement(element);
        if (sectionHeading) {
          extractedChapters.push({ ...sectionHeading, order: chapterCount + 1 });
          chapterCount++;
        } else if ((element.tag === 'ChapterTitle' || element.tag === 'head') && element.text) {
          const chapterId = `chapter-${chapterCount}`;
          extractedChapters.push({
            text: element.text,
            translation: element.translated_text,
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
    setInitialRenderComplete(false);
    // Don't clear matchedBookSegments here - it's managed by the parent
    // and should persist when opening a book from advanced search.
    // searchMatchedSegments belongs to useInPageSearch, which searches the new book itself.
  }, [bookText]);

  // Footnotes numbered and top-level items built once per book. The segment
  // refs are reset here, before the new book's segments mount and register
  // themselves; the memoized segments register once and keep their entries.
  const items = React.useMemo(() => {
    segmentRefs.current = new Map();
    return buildItems(annotateNotes(bookText.body || []));
  }, [bookText]);

  const matchedSet = React.useMemo(() => new Set(matchedBookSegments), [matchedBookSegments]);

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

  const handleChapterClick = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

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
          textType={textType}
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
        {items.map((item) => {
          const target =
            targetSegmentNumber !== null && item.segments.includes(targetSegmentNumber)
              ? targetSegmentNumber
              : null;
          const matchedKey = item.segments.filter((n) => matchedSet.has(n)).join(',');
          return (
            <React.Fragment key={item.key}>
              <BookSegment
                element={item.element}
                labelId={item.labelId}
                labelSegmentNumber={item.labelSegmentNumber}
                textType={textType}
                targetSegmentNumber={target}
                matchedKey={matchedKey}
                highlightQuery={target !== null || matchedKey ? query : ''}
                chapterIds={chapterIdMap.current}
                segmentRefs={segmentRefs}
                handleWordClick={handleWordClick}
              />
              {['lg', 'p', 'pb', 'l'].includes(item.element.tag) && <br />}
            </React.Fragment>
          );
        })}
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
