import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { ActionToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import {
  Select,
  MultiSelect,
  Grid,
  Textarea,
  Button,
  Loader,
  Text,
  Stack,
  ActionIcon,
  Skeleton,
  useMantineTheme,
  Transition,
  Modal,
} from '@mantine/core';
import { FileInput } from '@mantine/core';
import { ComboboxItem, Container, lighten, darken, ScrollArea } from '@mantine/core';
import {
  useDisclosure,
  useDebouncedState,
  useMediaQuery,
  useHotkeys,
  useViewportSize,
} from '@mantine/hooks';
import WordDataComponent from '@/components/WordEntries/WordDataComponent';
import {
  fetchWordData,
  fetchMultidictData,
  transliterateText,
  handleTranslate,
} from '../utils/Api';
import { HeaderSearch } from '@/components/Header/HeaderSearch';
import { NavbarSimple } from '@/components/Navbar/NavbarSimple';
import {
  IconVocabularyOff,
  IconChevronUp,
  IconChevronDown,
  IconChevronsRight,
  IconChevronRight,
} from '@tabler/icons-react';
import { IconClipboardCheck, IconCopy, IconClipboard } from '@tabler/icons-react';
import classes from './HomePage.module.css';
import DictionarySelectComponent from '@/components/Navbar/DictionarySelect';
import BookSelect from '@/components/Navbar/BookSelect';
import ClickableSimpleBooks from '@/components/ClickableBooks/ClickableSimpleBooks';
import ClickableWords from '@/components/ClickableWords';
import { WordEntry, GroupedEntries } from '../types/wordTypes';
import { BookText, TextElement } from '../types/bookTypes';
import TranslationControl from '@/components/Navbar/TranslationControl';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import AdvancedSearch from '@/components/AdvancedSearch/AdvancedSearch';
import { SearchResult } from '@/types/searchTypes';
import { Analytics } from '@vercel/analytics/react';
import { useResponsive } from '@/context/ResponsiveContext';

import { useContainerHeadroom } from '../hooks/useHeadroom';

import { fetchBookText } from '../utils/apiService';

import ResizablePanel from '../components/ResizeHandler';

// unused
interface Translation {
  English: string;
  Sanskrit: string;
}

interface ResizablePanelHandle {
  setBreakpoint: (breakpointIndex: number) => void;
  getCurrentHeight: () => number;
  isAtBreakpoint: (breakpointIndex: number, tolerance?: number) => boolean;
}

export function HomePage() {
  // ----- General state -----
  const [text, setText] = useState('');
  const [scheme, setScheme] = useState<ComboboxItem>({ value: 'IAST', label: 'IAST' });
  const [textTranslit, setTextTranslit] = useDebouncedState('', 100);
  const [translatedText, setTranslatedText] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [bookText, setBookText] = useState<BookText>({});
  const [textType, setTextType] = useState('both');
  const [selectedDictionaries, setSelectedDictionaries] = useState<string[]>([]);
  const [isWordInfoVisible, setIsWordInfoVisible] = useState(false);
  const [displayInflectionTables, setDisplayInflectionTables] = useState(false);
  const [isLoadingWordData, setIsLoadingWordData] = useState(false);

  const [isAdvancedSearchVisible, handleAdvancedSearch] = useDisclosure(false);

  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  // ----- Derived state -----
  const isTextEmpty = text === '' && Object.keys(bookText).length === 0;
  const words = textTranslit ? textTranslit.split(/\s+|\\+/) : [];
  const lines = textTranslit ? textTranslit.split('\n') : [];

  const [wordData, setWordData] = useState<WordEntry[]>([]);
  const [clickedAdditionalWord, setClickedAdditionalWord] = useState<string | null>(null);

  // ----- Media queries -----

  const { isMobile, isTablet, isSmallMobile } = useResponsive();

  const shouldUseColumn = isMobile || (isTablet && isNavbarVisible);

  const [searchMatchedSegments, setSearchMatchedSegments] = useState<number[]>([]);


  // ----- Constants -----

  const { height: viewportHeight } = useViewportSize();
  const headerHeight = isMobile ? 0 : 56;
  const availableHeight = viewportHeight - headerHeight;

  const [isLoadingBook, setIsLoadingBook] = useState(false);

  const [advancedSearchResults, setAdvancedSearchResults] = useState<SearchResult | null>(null);
  const [targetSegmentNumber, setTargetSegmentNumber] = useState<number | null>(null);
  const [query, setQuery] = useState<string>('');
  const [matchedBookSegments, setMatchedBookSegments] = useState<number[]>([]);

  const isWordInfoHalf = text !== '' || bookTitle !== null;

  // OLD const breakpoints = [50, 450, 600, 800];

  const breakpoints = [40, 380, 600];

  const panelRef = useRef<ResizablePanelHandle>(null);

  useHotkeys([['mod+s', () => handleAdvancedSearch.toggle()]]);

  // Effect to scroll to clicked word
  useEffect(() => {
    if (clickedAdditionalWord) {
      let element = document.querySelector(`h1[data-word="${clickedAdditionalWord}"]`);
      setIsWordInfoVisible(true);
      handleAdvancedSearch.close();

      if (!element) {
        const allH1s = document.querySelectorAll('h1');
        for (const h1 of allH1s) {
          if (h1.textContent?.trim() === clickedAdditionalWord) {
            element = h1;
            break;
          }
        }
      }
      if (element) {
        setTimeout(() => {
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      setClickedAdditionalWord(null);
    }
    // If the panel is collapsed, expand it
    if (isMobile && isWordInfoHalf && panelRef.current && panelRef.current.isAtBreakpoint(0, 20)) {
      panelRef.current.setBreakpoint(1);
    }
  }, [clickedAdditionalWord]);

  // Effect to select single word
  useEffect(() => {
    if (textTranslit && words.length === 1) {
      setSelectedWord(words[0].trim());
    }
  }, [textTranslit, words]);

  useEffect(() => {
    if (selectedWord !== '') {
      // Always make word info visible
      setIsWordInfoVisible(true);

      // If the panel is collapsed, expand it
      if (
        isMobile &&
        isWordInfoHalf &&
        panelRef.current &&
        panelRef.current.isAtBreakpoint(0, 20)
      ) {
        panelRef.current.setBreakpoint(1);
      }
    }
  }, [selectedWord, isMobile, isWordInfoHalf]);

  // Effect to fetch word data when a word is selected
  useEffect(() => {
    if (selectedWord) {
      setIsLoadingWordData(true);
      fetchMultidictData(selectedWord, selectedDictionaries)
        .then((data) => {
          setWordData(data);
          setIsLoadingWordData(false);
          handleAdvancedSearch.close();
        })
        .catch(() => {
          setIsLoadingWordData(false);
        });
    }
  }, [selectedWord, selectedDictionaries]);

  // Effect to fetch book text when a book is selected
  useEffect(() => {
    if (bookTitle) {
      const fetchData = async () => {
        try {
          setIsLoadingBook(true);

          try {
            // Always try the API first
            await fetchBookFromApi(bookTitle);
          } catch (apiError) {
            // If API fails, try the local resource
            console.log('API fetch failed, trying local resource');
            // for offline add /public/ for online remove it or it won't load the books
            const response = await fetch(`/public/resources/books/${bookTitle}.json`);
            if (!response.ok) {
              throw new Error(`Failed to fetch: ${response.status}`);
            }
            const data = await response.json();
            setBookText(data);
          }
        } catch (error) {
          console.error('Error loading book:', error);
        } finally {
          setIsLoadingBook(false);
          console.log('book text:', bookText);
        }
      };

      fetchData();
    }
  }, [bookTitle]);

  // Function to fetch a book from the API
  const fetchBookFromApi = async (title: string) => {
    try {
      const bookData = await fetchBookText(title);
      setBookText(bookData);
      // here it should be scrolling to the segment number
    } catch (error) {
      console.error('Error fetching book from API:', error);
      throw error;
    }
  };

  // ----- Functions -----

  // Toggle navbar visibility
  const toggleNavbar = () => {
    setIsNavbarVisible((prevState) => !prevState);
  };

  // Transliterate text
  const handleTransliteration = async (inputText: string, newValue?: string) => {
    const selectedValue = newValue || scheme.value;
    const transliteratedText = await transliterateText(inputText, selectedValue);
    setTextTranslit(transliteratedText);
  };

  // Translate text
  const updateTranslate = async (inputText: string) => {
    setLoading(true);
    const response = await handleTranslate(inputText);
    setTranslatedText(response.translation);
    setLoading(false);
  };

  // Calculate heights based on viewport
  const vhActual = `${availableHeight}px`;
  const vhActualHalf = `${availableHeight / 2}px`;

  const showEmptyMobileState = isMobile && text === null && bookTitle === null && wordData == null;

  const textScrollRef = useRef<HTMLDivElement>(null);

  // Add the container headroom hook
  const headerIsPinned = useContainerHeadroom({
    containerRef: textScrollRef,
    fixedAt: 40,
  });

  const shouldShowHeader = isNavbarVisible || headerIsPinned || !isMobile;

  // now the main page
  // mainContainer wrapping everything
  // header fixed on top
  // contentBox with all the space under the header
  // navbarBox with the navbar
  // when it isn't mobile and the navbar isn't visible:
  // wholeGrid for the whole grid
  // when text or title isn't null:
  // textDisplay grid column
  //scrollContainer
  //clickableWords for user-input
  //clickableSimpleBooks for books
  // same condition as before, when text or title isn't null
  // wordInfoHalfColumn
  //chevron container
  //scrollContainer
  //advancedSearch
  //wordContainer
  // when text and title are null:
  // wordInfoFull column
  //chevron container
  //scrollContainer
  //advancedSearch
  //wordContainer

  // to do: simply make an object with the styles for half and full
  // according to the condition: when text or title isn't null
  // select class and style set
  // and display the chevronContainer
  // then add a good sliding transition from left to right when text appears
  // and a good sliding transition from right to left when the column is closed

  return (
    <div className={classes.mainContainer}>
      <div
        className={`${classes.headerContainer} ${!shouldShowHeader ? classes.headerHidden : ''}`}
      >
        <HeaderSearch
          onSearch={setSelectedWord}
          onToggleNavbar={toggleNavbar}
          isMobile={isMobile}
          isNavbarVisible={isNavbarVisible}
          handleAdvancedSearch={handleAdvancedSearch}
        />
      </div>

      <div
        className={`${classes.contentBox}`} // Also update here if you use contentBoxHeaderHidden
        style={{
          display: 'flex',
          overflow: 'hidden',
          position: 'fixed',
          width: '100%',
          height: vhActual,
          bottom: 0,
        }}
      >
        <div
          className={`${classes.navbarBox} ${!isNavbarVisible ? classes.navbarHidden : ''}`}
          style={{
            width: isNavbarVisible ? (isMobile ? '100vw' : isTablet ? '350px' : '350px') : 0,
          }}
        >
          <NavbarSimple
            isNavbarVisible={isNavbarVisible}
            isMobile={isMobile}
            isTablet={isTablet}
            isSmallMobile={isSmallMobile}
            scheme={scheme}
            setScheme={setScheme}
            handleTransliteration={handleTransliteration}
            selectedDictionaries={selectedDictionaries}
            setSelectedDictionaries={setSelectedDictionaries}
            bookTitle={bookTitle}
            setBookTitle={setBookTitle}
            textType={textType}
            setTextType={setTextType}
            text={text}
            setText={setText}
            setIsNavbarVisible={setIsNavbarVisible}
            handleAdvancedSearch={handleAdvancedSearch}
          />
        </div>

        <Grid
          className={classes.wholeGrid}
          justify="space-around"
          align="stretch"
          style={{
            display: 'flex',
            flexDirection: shouldUseColumn ? 'column' : 'row',
            flexWrap: 'nowrap',
            justifyContent: 'left',
            transition: 'padding-left 0.3s ease',
            paddingRight: isMobile ? '16px' : '8px',
            paddingLeft: isMobile ? '16px' : '8px',
            position: 'relative',
            width: '100%',
            paddingTop: '8px',
          }}
        >
          {text !== '' || bookTitle !== null ? (
            <Grid.Col
              span={
                isMobile
                  ? 12
                  : isTablet && isNavbarVisible
                    ? 12
                    : (selectedWord !== '' && isWordInfoVisible) ||
                        (isWordInfoVisible && isAdvancedSearchVisible)
                      ? 6
                      : 12
              }
              className={`${classes.textDisplay}`}
              style={{
                paddingTop: '0px',
                height: isMobile
                  ? isWordInfoVisible
                    ? vhActual
                    : //`${availableHeight - currentHeight}px`
                      vhActual
                  : isTablet && isNavbarVisible
                    ? isWordInfoVisible
                      ? vhActualHalf
                      : vhActual
                    : vhActual,
                width: isMobile ? '100%' : isWordInfoVisible ? '50%' : '100%',
                paddingLeft: isMobile
                  ? '6%'
                  : isTablet
                    ? isNavbarVisible
                      ? isWordInfoVisible
                        ? '10%'
                        : '10%'
                      : isWordInfoVisible
                        ? '12%'
                        : '22%'
                    : isNavbarVisible
                      ? isWordInfoVisible
                        ? '6%'
                        : '18%' // navbar
                      : isWordInfoVisible
                        ? '12%'
                        : '24%', // no navbar
                paddingRight: isMobile
                  ? '6%'
                  : isTablet
                    ? isNavbarVisible
                      ? isWordInfoVisible
                        ? '10%'
                        : '10%'
                      : isWordInfoVisible
                        ? '3%'
                        : '20%'
                    : isNavbarVisible
                      ? isWordInfoVisible
                        ? '3%'
                        : '25%'
                      : isWordInfoVisible
                        ? '3%'
                        : '28%',
                transition: 'all 0.3s ease',
                overflowY: 'auto',
                overflowX: 'hidden',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                paddingBottom: '0px',
              }}
            >
              <div
                className={classes.scrollContainer}
                style={{
                  borderBottom:
                    // (isMobile && isWordInfoVisible) ||
                    isTablet && isNavbarVisible && isWordInfoVisible
                      ? '1px solid lightgray'
                      : 'none',
                }}
                ref={textScrollRef}
              >
                {textTranslit !== '' && (
                  <ClickableWords
                    lines={lines}
                    textTranslit={textTranslit}
                    selectedWord={selectedWord}
                    setSelectedWord={setSelectedWord}
                    selectedDictionaries={selectedDictionaries}
                    wordData={wordData}
                    isLoadingWordData={isLoadingWordData}
                    setClickedAdditionalWord={setClickedAdditionalWord}
                    setIsLoadingWordData={setIsLoadingWordData}
                  />
                )}

                <ClickableSimpleBooks
                  bookText={bookText}
                  setSelectedWord={setSelectedWord}
                  wordData={wordData}
                  setClickedAdditionalWord={setClickedAdditionalWord}
                  textType={textType}
                  isLoadingWordData={isLoadingWordData}
                  targetSegmentNumber={targetSegmentNumber}
                  setTargetSegmentNumber={setTargetSegmentNumber}
                  query={query}
                  matchedBookSegments={matchedBookSegments}
                  setMatchedBookSegments={setMatchedBookSegments}
                  searchMatchedSegments={searchMatchedSegments}
                  setSearchMatchedSegments={setSearchMatchedSegments}

                />
              </div>
            </Grid.Col>
          ) : null}

          {/* Here starts the wordInfo column */}

          <Transition
            mounted={isWordInfoVisible || !isWordInfoHalf}
            transition={isWordInfoHalf ? 'slide-left' : 'slide-right'}
            duration={300}
            timingFunction="ease"
          >
            {(styles) => (
              <>
                {/* For mobile when in WordInfoHalf mode, use ResizablePanel 
                      it doesn't make sense to have the isLoadingState in the parent - it should be in the child
                      so many more things should be memoised*/}
                {isMobile && isWordInfoHalf ? (
                  <ResizablePanel
                    ref={panelRef}
                    breakpoints={breakpoints}
                    initialBreakpointIndex={1}
                  >
                    <div className={classes.scrollContainer}>
                      {isLoadingWordData ? (
                        <LoadingSkeleton />
                      ) : (
                        <WordDataComponent
                          wordData={wordData}
                          setWordData={setWordData}
                          selectedDictionaries={selectedDictionaries}
                          isMobile={isMobile}
                          isTablet={isTablet}
                          isNavabarVisible={isNavbarVisible}
                          setDisplayInflectionTables={setDisplayInflectionTables}
                          displayInflectionTables={displayInflectionTables}
                        />
                      )}
                    </div>
                  </ResizablePanel>
                ) : (
                  <Grid.Col
                    span={isWordInfoHalf && !isMobile && !(isTablet && isNavbarVisible) ? 6 : 12}
                    className={`${classes.wordInfo} 
                              ${classes.wordInfoTransition}
                              ${isWordInfoHalf ? classes.wordInfoHalf : classes.wordInfoFull}`}
                    style={
                      isWordInfoHalf
                        ? {
                            overflowY: 'hidden',
                            opacity: !isWordInfoVisible ? 0 : 1,
                            visibility: !isWordInfoVisible ? 'hidden' : 'visible',
                            height: isMobile
                              ? vhActualHalf
                              : isTablet
                                ? isNavbarVisible
                                  ? vhActualHalf
                                  : vhActual
                                : vhActual,
                            width: isMobile
                              ? '100%'
                              : isTablet
                                ? isNavbarVisible
                                  ? '100%'
                                  : '50%'
                                : '50%',
                            paddingLeft: isMobile
                              ? '6%'
                              : isTablet
                                ? isNavbarVisible
                                  ? '10%'
                                  : '3%'
                                : isNavbarVisible
                                  ? '3%'
                                  : '3%',
                            paddingRight: isMobile
                              ? '6%'
                              : isTablet
                                ? isNavbarVisible
                                  ? '10%'
                                  : '12%'
                                : isNavbarVisible
                                  ? '10%'
                                  : '18%',
                          }
                        : {
                            maxHeight: vhActual,
                            width: '100%',
                            paddingLeft: isMobile
                              ? '6%'
                              : isTablet
                                ? isNavbarVisible
                                  ? '12%'
                                  : '22%'
                                : isNavbarVisible
                                  ? '25%'
                                  : '28%',
                            paddingRight: isMobile
                              ? '6%'
                              : isTablet
                                ? isNavbarVisible
                                  ? '12%'
                                  : '22%'
                                : isNavbarVisible
                                  ? '25%'
                                  : '28%',
                          }
                    }
                  >
                    {showEmptyMobileState && (
                      <Text c="dimmed" ta="center" mt="xl">
                        Select a book or enter text to begin
                      </Text>
                    )}

                    {/* Here starts the chevron container */}
                    {isWordInfoHalf && (
                      <div className={classes.chevronContainer}>
                        <ActionIcon
                          className={classes.chevronButton}
                          onClick={() => setIsWordInfoVisible(!isWordInfoVisible)}
                          data-rotated={!isWordInfoVisible}
                          aria-label={isWordInfoVisible ? 'Collapse word info' : 'Expand word info'}
                          variant="transparent"
                          size="md"
                          style={{
                            right: isMobile ? '4px' : '-0px',
                            top: isMobile ? 0 : '20px',
                          }}
                        >
                          {isMobile ? (
                            <IconChevronDown size={20} stroke={1.5} />
                          ) : (
                            <IconChevronRight size={20} stroke={1.5} />
                          )}
                        </ActionIcon>
                      </div>
                    )}

                    <div className={classes.scrollContainer}>
                      {isLoadingWordData ? (
                        <LoadingSkeleton />
                      ) : (
                        <WordDataComponent
                          wordData={wordData}
                          setWordData={setWordData}
                          selectedDictionaries={selectedDictionaries}
                          isMobile={isMobile}
                          isTablet={isTablet}
                          isNavabarVisible={isNavbarVisible}
                          setDisplayInflectionTables={setDisplayInflectionTables}
                          displayInflectionTables={displayInflectionTables}
                        />
                      )}
                    </div>
                  </Grid.Col>
                )}
              </>
            )}
          </Transition>
        </Grid>
      </div>
      {/* Add the modal at the end of your component, before the Analytics tag */}
      <Modal
        className={classes.advancedSearchModal}
        opened={isAdvancedSearchVisible}
        onClose={handleAdvancedSearch.close}
        size="xl"
        fullScreen={isMobile} // Add fullScreen prop for mobile
        centered
        classNames={{
          header: classes.modalHeader,
          title: classes.modalTitle,
          close: classes.modalClose,
          body: classes.modalBody,
        }}
      >
        <AdvancedSearch
          advancedSearchResults={advancedSearchResults}
          setAdvancedSearchResults={setAdvancedSearchResults}
          isMobile={isMobile}
          query={query}
          setQuery={setQuery}
          onSearch={(params) => {
            console.log('Advanced search params:', params);
          }}
          setTargetSegmentNumber={setTargetSegmentNumber}
          onOpenText={(textId, bookTitle) => {
            // Store both the ID and title
            setBookTitle(bookTitle);
          }}
          matchedBookSegments={matchedBookSegments}
          setMatchedBookSegments={setMatchedBookSegments}
          handleAdvancedSearch={handleAdvancedSearch}
          setIsNavbarVisible={setIsNavbarVisible}
          isAdvancedSearchVisible={isAdvancedSearchVisible}
        />
      </Modal>

      <Analytics />
    </div>
  );
}
