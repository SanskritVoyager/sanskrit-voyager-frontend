import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { findOriginalBySlug, loadTitles, toSlug } from '../utils/bookSlug';
import {
  Select,
  MultiSelect,
  Grid,
  Textarea,
  Button,
  Loader,
  Stack,
  ActionIcon,
  Skeleton,
  useMantineTheme,
  Transition,
  Modal,
 FileInput, ComboboxItem, Container, lighten, darken, ScrollArea } from '@mantine/core';
import {
  useDisclosure,
  useDebouncedState,
  useMediaQuery,
  useHotkeys,
  useViewportSize,
} from '@mantine/hooks';
import {
  IconVocabularyOff,
  IconChevronUp,
  IconChevronDown,
  IconChevronsRight,
  IconChevronRight,
 IconClipboardCheck, IconCopy, IconClipboard } from '@tabler/icons-react';
import { Analytics } from '@vercel/analytics/react';
import { ActionToggle } from '../components/Header/ColorSchemeToggle/ColorSchemeToggle';
import WordDataComponent from '@/components/WordEntries/WordDataComponent';
import {
  fetchWordData,
  fetchMultidictData,
  transliterateText,
  handleTranslate,
} from '../utils/Api';
import { HeaderSearch } from '@/components/Header/HeaderSearch';
import { NavbarSimple } from '@/components/Navbar/NavbarSimple';
import Welcome from '@/components/Welcome/Welcome';
import classes from './HomePage.module.css';
import DictionarySelectComponent from '@/components/Navbar/DictionarySelect';
import ClickableSimpleBooks from '@/components/ClickableBooks/ClickableSimpleBooks';
import ClickableWords from '@/components/ClickableWords';
import { WordEntry, GroupedEntries } from '../types/wordTypes';
import { BookText, TextElement } from '../types/bookTypes';
import TranslationControl from '@/components/Navbar/TranslationControl';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import AdvancedSearch from '@/components/AdvancedSearch/AdvancedSearch';
import { SearchResult } from '@/types/searchTypes';
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
  // ----- Routing -----
  const { slug, segment } = useParams<{ slug?: string; segment?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTextRoute = location.pathname.startsWith('/text/');

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
  // Start the navbar closed when the app is opened directly via a deep link
  // (a /book or /text URL carries a :slug) on mobile, where the navbar fills
  // the screen (100vw) and would otherwise cover the text. matchMedia is read
  // synchronously so the navbar starts in the right state — useMediaQuery
  // resolves in an effect and would flash it open first. Landing on '/' (no
  // slug) and desktop deep links keep the navbar open as before.
  const [isNavbarVisible, setIsNavbarVisible] = useState(() => {
    if (!slug) return true;
    const isMobileViewport =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 660px)').matches;
    return !isMobileViewport;
  });

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
  const [inPageSearchTrigger, setInPageSearchTrigger] = useState<boolean | undefined>(undefined);
  const [activeComponent, setActiveComponent] = useState<'clickableWords' | 'clickableSimpleBooks' | null>(null);

  // ----- Constants -----

  const { height: viewportHeight } = useViewportSize();
  // Content spans the full viewport on every breakpoint; the fixed header floats
  // over it (see-through). Only the navbar is offset by the 56px header height,
  // handled in CSS (.navbarBox), since the header's buttons sit over its top-left.
  const availableHeight = viewportHeight;

  const [isLoadingBook, setIsLoadingBook] = useState(false);

  const [advancedSearchResults, setAdvancedSearchResults] = useState<SearchResult | null>(null);
  const [targetSegmentNumber, setTargetSegmentNumber] = useState<number | null>(null);
  const [query, setQuery] = useState<string>('');
  const [matchedBookSegments, setMatchedBookSegments] = useState<number[]>([]);

  const isWordInfoHalf = text !== '' || bookTitle !== null;
  const showWelcomeState =
    text.trim() === '' && bookTitle === null && selectedWord.trim() === '' && wordData.length === 0;

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

  // Effect to track when textTranslit changes (ClickableWords becomes active)
  useEffect(() => {
    if (textTranslit !== '') {
      setActiveComponent('clickableWords');
      // Clear book-related search states when switching to ClickableWords
      setSearchMatchedSegments([]);
      setMatchedBookSegments([]);
      setTargetSegmentNumber(null);
    }
  }, [textTranslit]);

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
            // If API fails, try the local resource.
            // Book filenames on disk are a mix of NFC and NFD (macOS APFS preserves
            // whatever form the file was created with), so try the title as-is first
            // and fall back to the other normalization. Vite's SPA fallback returns
            // text/html with 200, so we check Content-Type instead of response.ok.
            const tryLocalFetch = async (name: string) => {
              const r = await fetch(`/resources/books/${name}.json`);
              if (!r.ok) return null;
              if (!(r.headers.get('content-type') || '').includes('json')) return null;
              return r.json();
            };
            const data =
              (await tryLocalFetch(bookTitle.normalize('NFC'))) ??
              (await tryLocalFetch(bookTitle.normalize('NFD')));
            if (!data) {
              throw new Error(`Failed to fetch local book: ${bookTitle}`);
            }
            setBookText(data);
          }
        } catch (error) {
          console.error('Error loading book:', error);
        } finally {
          setIsLoadingBook(false);
        }
      };

      /*
        try {
            setIsLoadingBook(true);
            setBookText({}); // Clear previous book text
            const response = await fetch(`/resources/books/${bookTitle}.json`);
            const data = await response.json();
            setBookText(data);
          }  catch (error) {
          console.error('Error loading book:', error);
        } finally {
          setIsLoadingBook(false);
        }
      };
      */

      fetchData();
      //console.log('book text:', bookText);
      // Set ClickableSimpleBooks as active when a book is selected
      setActiveComponent('clickableSimpleBooks');
      // Clear ClickableWords search states when switching to books
      setSearchMatchedSegments([]);
    }
  }, [bookTitle]);

  // Effect: URL → bookTitle. Resolves the route slug to the identifier the
  // loader expects. /book/:slug → reverse-lookup via titles.json (curated
  // catalog). /text/:slug → slug is the backend identifier; the AdvancedSearch
  // callback sets bookTitle to the original (with diacritics) before navigating,
  // so the toSlug-match guard below avoids clobbering it. Cold-loads of /text/
  // URLs use the slug as-is and rely on backend tolerance.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    if (isTextRoute) {
      if (!bookTitle || toSlug(bookTitle) !== slug) setBookTitle(slug);
    } else {
      loadTitles()
        .then((titles) => {
          if (cancelled) return;
          const original = findOriginalBySlug(slug, titles);
          if (original && bookTitle !== original) setBookTitle(original);
        })
        .catch((err) => console.error('Failed to resolve book slug:', err));
    }
    return () => {
      cancelled = true;
    };
  }, [slug, isTextRoute]);

  // Effect: URL :segment → targetSegmentNumber. Runs after the loader effect
  // sets bookText so the existing scroll-to-segment logic picks it up.
  useEffect(() => {
    if (segment == null) return;
    const n = Number(segment);
    if (Number.isFinite(n)) setTargetSegmentNumber(n);
  }, [segment]);

  // ----- Dictionary search ↔ URL sync -----
  // The lookup lives in a query string (?w=…&dicts=…) rather than a path
  // segment so it layers on top of the book/text route instead of replacing
  // it — you can look a word up while reading. mw is the default dictionary,
  // so a bare-mw (or empty) selection is omitted from the URL; any other set
  // is encoded in full (mw included if it's there alongside others).
  const isDefaultDicts = (dicts: string[]) =>
    dicts.length === 0 || (dicts.length === 1 && dicts[0] === 'mw');

  // Effect: URL ?w / ?dicts → dictionary search state. Authoritative, so
  // sharing a link, the back button, and forward all reproduce the lookup.
  useEffect(() => {
    const w = searchParams.get('w') ?? '';
    if (w !== selectedWord) setSelectedWord(w);

    const dictsParam = searchParams.get('dicts');
    const dicts = dictsParam ? dictsParam.split(',').filter(Boolean) : [];
    if (dicts.join(',') !== selectedDictionaries.join(',')) setSelectedDictionaries(dicts);
  }, [searchParams]);

  // Effect: dictionary search state → URL. Skips the first run so the read
  // effect above can hydrate state from an incoming URL without it being
  // wiped before the word lands.
  const skipDictUrlWrite = useRef(true);
  useEffect(() => {
    if (skipDictUrlWrite.current) {
      skipDictUrlWrite.current = false;
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (selectedWord) next.set('w', selectedWord);
    else next.delete('w');
    if (isDefaultDicts(selectedDictionaries)) next.delete('dicts');
    else next.set('dicts', selectedDictionaries.join(','));
    if (next.toString() !== searchParams.toString()) setSearchParams(next);
  }, [selectedWord, selectedDictionaries]);

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
          onToggleInPageSearch={() => setInPageSearchTrigger(prev => !prev)}
          bookTitle={bookTitle}
        />
      </div>

      <div
        className={`${classes.contentBox}`} // Also update here if you use contentBoxHeaderHidden
        style={{
          display: 'flex',
          overflow: 'hidden',
          position: 'fixed',
          width: '100%',
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
                {activeComponent === 'clickableWords' && textTranslit !== '' && (
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

                {activeComponent === 'clickableSimpleBooks' && (
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
                    inPageSearchTrigger={inPageSearchTrigger}
                  />
                )}
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
                            // Match the book column's explicit paddingTop:0 inline, so
                            // Mantine's Grid.Col gutter can't push this column lower than
                            // the book column and misalign the two titles.
                            paddingTop: 0,
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

                    <div
                      className={classes.scrollContainer}
                      style={{
                        // The chevron floats as this column's first child; the scroll
                        // container is a BFC (overflow:auto), so it drops below the float,
                        // pushing the dictionary heading down by the chevron's height
                        // (28px, the md ActionIcon). The chevron only renders in half mode,
                        // so there trim that 28px off the 56px header reserve to bring the
                        // heading back in line with the book title. (Don't touch the chevron.)
                        paddingTop: isWordInfoHalf ? 'calc(56px - 28px)' : undefined,
                      }}
                    >
                      {showWelcomeState ? (
                        <Welcome setBookTitle={setBookTitle} bookTitle={bookTitle} />
                      ) : isLoadingWordData ? (
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
        trapFocus={false}
      >
        <AdvancedSearch
          advancedSearchResults={advancedSearchResults}
          setAdvancedSearchResults={setAdvancedSearchResults}
          isMobile={isMobile}
          query={query}
          setQuery={setQuery}
          onSearch={(params) => {
            // console.log('Advanced search params:', params);
          }}
          setTargetSegmentNumber={setTargetSegmentNumber}
          onOpenText={(textId, bookTitle, segmentNumber) => {
            // Set bookTitle directly with the original (diacritics preserved) so
            // the API call uses what the backend expects. The URL gets the ASCII
            // slug only for cosmetics/sharing; the URL effect's slug-match guard
            // prevents it from overwriting bookTitle back to the slug.
            setBookTitle(bookTitle);
            const path = `/text/${toSlug(bookTitle)}` + (segmentNumber ? `/${segmentNumber}` : '');
            navigate(path);
          }}
          matchedBookSegments={matchedBookSegments}
          setMatchedBookSegments={setMatchedBookSegments}
          handleAdvancedSearch={handleAdvancedSearch}
          setIsNavbarVisible={setIsNavbarVisible}
        />
      </Modal>

      <Analytics />
    </div>
  );
}
