import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SegmentedControl,
  MultiSelect,
  Button,
  Stack,
  Title,
  Text,
  Accordion,
  Group,
  ActionIcon,
  Tooltip,
  Anchor,
} from '@mantine/core';
import {
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';
import classes from './AdvancedSearch.module.css';
import { SearchResult } from '../../types/searchTypes';
import { toSlug } from '../../utils/bookSlug';
import SearchInputComponent from './AdvancedSearchInput';
import AdvancedSearchResults from './AdvancedSearchResults';
import filterData from '../../utils/filter_data.json';

/** One passage of the result list, in display order, so the reader can step through hits */
export interface SearchHit {
  hitId: string;
  textId: string;
  title: string;
  segmentNumber: number;
}

export const flattenHits = (results: SearchResult | null): SearchHit[] => {
  if (!results) return [];
  if (results.type === 'segments') {
    return results.results.map((segment) => ({
      hitId: segment.segment_id,
      textId: segment.segment_id.split(':')[0],
      title: segment.title || 'Unknown Text',
      segmentNumber: segment.segment_number,
    }));
  }
  return results.results.flatMap((book) =>
    book.segments.map((segment) => ({
      hitId: segment.segment_id,
      textId: book.text_id,
      title: book.title,
      segmentNumber: segment.segment_number,
    }))
  );
};

interface AdvancedSearchProps {
  advancedSearchResults: SearchResult | null;
  setAdvancedSearchResults: (results: SearchResult | null) => void;
  onSearch: (params: any) => void;
  onOpenText?: (textId: string, title: string, segmentNumber?: number) => void;
  isMobile: boolean | undefined;
  /** Rendered beside an open text: tighter header, no autofocus */
  compact?: boolean;
  /** Title of the text open in the reader, whose matching segments get markers */
  openTitle: string | null;
  setTargetSegmentNumber: (segmentNumber: number) => void;
  query: string;
  setQuery: (query: string) => void;
  matchedBookSegments: number[];
  setMatchedBookSegments: (segments: number[]) => void;
  /** Which search the current results answer; kept by the parent so a remount doesn't refetch */
  searchedKey: string;
  setSearchedKey: (key: string) => void;
  /** The hit last opened in the reader */
  currentHitId: string | null;
  setCurrentHitId: (hitId: string | null) => void;
  setIsNavbarVisible: (value: boolean) => void;
}

function AdvancedSearch({
  advancedSearchResults,
  setAdvancedSearchResults,
  onSearch,
  onOpenText,
  isMobile,
  compact = false,
  openTitle,
  setTargetSegmentNumber,
  query,
  setQuery,
  setMatchedBookSegments,
  searchedKey,
  setSearchedKey,
  currentHitId,
  setCurrentHitId,
  setIsNavbarVisible,
}: AdvancedSearchProps) {
  const [queryType, setQueryType] = useState('stemmed');
  const [searchType, setSearchType] = useState<'segments' | 'books'>('books');
  const [authors, setAuthors] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const limit = 500;

  // State for handling the search process
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<string[]>([]);

  const currentInput = useRef<string | null>(null);
  // Only the newest request may report back
  const requestId = useRef(0);

  // Transform titles for MultiSelect
  const titleOptions = filterData.titles.map((item) => ({
    value: item.text_id,
    label: item.title,
  }));

  // Transform authors for MultiSelect
  const authorOptions = filterData.authors.map((author) => ({
    value: author,
    label: author,
  }));

  // Transform collections for MultiSelect
  const collectionOptions = filterData.collections.map((collection) => ({
    value: collection,
    label: collection,
  }));

  const searchKey = `${searchType}|${queryType}|${query}`;

  // Function to handle the search API call
  const handleSearch = async () => {
    requestId.current += 1;
    const id = requestId.current;

    // Reset previous search state
    setIsLoading(true);
    setError(null);
    setAdvancedSearchResults(null);
    setCurrentHitId(null);

    const searchParams: {
      query: string;
      query_type: string;
      search_type: 'segments' | 'books';
      limit: number;
      authors?: string[];
      collections?: string[];
      text_ids?: string[];
    } = {
      query,
      query_type: queryType,
      search_type: searchType,
      authors,
      text_ids: titles,
      collections,
      limit,
    };

    try {
      const response = await fetch('https://api.yogasutratrees.com/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      if (id !== requestId.current) return;

      setAdvancedSearchResults({
        type: searchType,
        results: data,
      });
      setSearchedKey(searchKey);
      onSearch(data);
    } catch (err: any) {
      if (id !== requestId.current) return;
      setError(err.message || 'An error occurred while searching');
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  };

  // A new query, result type or match mode runs a search. The key check keeps a
  // remount (switching panel tabs, collapsing the panel) from fetching again.
  useEffect(() => {
    if (query.trim() && searchKey !== searchedKey) handleSearch();
  }, [searchKey]);

  // Enter, the icon and the Search button all come here. The same query again
  // re-runs the search, so changed filters take effect.
  const submitQuery = (typed: string | null) => {
    const next = (typed ?? query).trim();
    if (!next) return;
    if (next === query) handleSearch();
    else setQuery(next);
  };

  const hits = useMemo(() => flattenHits(advancedSearchResults), [advancedSearchResults]);
  const currentHitIndex = currentHitId ? hits.findIndex((hit) => hit.hitId === currentHitId) : -1;

  // Markers in the reader come from the results in memory, for the text that is
  // open, so a shared /text/...?q= link gets them without a second request
  useEffect(() => {
    if (!openTitle || !advancedSearchResults) {
      setMatchedBookSegments([]);
      return;
    }
    const slug = toSlug(openTitle);
    setMatchedBookSegments(
      hits.filter((hit) => toSlug(hit.title) === slug).map((hit) => hit.segmentNumber)
    );
  }, [hits, openTitle]);

  // Opens a text at a passage; the panel stays, so the reader and the results
  // sit side by side
  const handleOpenText = (
    textId: string,
    title: string,
    segmentNumber?: number,
    hitId?: string
  ) => {
    if (!onOpenText) return;
    setTargetSegmentNumber(segmentNumber || 0);
    setCurrentHitId(hitId ?? null);
    onOpenText(textId, title, segmentNumber);
    // On a phone the results sheet takes the place of the navbar
    if (isMobile) setIsNavbarVisible(false);
  };

  const stepHit = (delta: 1 | -1) => {
    let next = currentHitIndex + delta;
    if (currentHitIndex === -1) next = delta > 0 ? 0 : hits.length - 1;
    const hit = hits[next];
    if (hit) handleOpenText(hit.textId, hit.title, hit.segmentNumber, hit.hitId);
  };

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.optionsContainer}>
        <Title order={compact ? 4 : 2} mb="xs" className={classes.title}>
          Sanskrit Corpus Search
        </Title>
        {!compact && (
          <Text size="sm" c="dimmed" mb="md">
            Search across the Sanskrit collection from{' '}
            <Anchor
              href="https://github.com/dharmamitra/dharmanexus"
              target="_blank"
              rel="noopener noreferrer"
              c="orange"
            >
              Buddhanexus
            </Anchor>{' '}
            with additional filters for more specific results.
          </Text>
        )}

        {/* Search bar at the top */}
        <SearchInputComponent
          onSubmit={submitQuery}
          isLoading={isLoading}
          classes={classes}
          currentInput={currentInput}
          autofocus={!compact}
          initialQuery={query}
        />

        <Stack gap="xs">
          {/* Search type segment control */}
          <div>
            <Group gap="lg" justify="flex-start">
              <Text size="sm" fw={500} mb={5} pr="7px">
                Result Type{' '}
              </Text>
              <Tooltip
                label="Show search result grouped by books or as individual segments."
                position="top-end"
                withArrow
              >
                <IconInfoCircle
                  size={14}
                  style={{
                    color: 'var(--mantine-color-dimmed)',
                    transform: 'translateY(-4px)',
                  }}
                />
              </Tooltip>
            </Group>
            <SegmentedControl
              value={searchType}
              onChange={(next) => setSearchType(next as 'segments' | 'books')}
              data={[
                { label: 'Individual Segments', value: 'segments' },
                { label: 'Grouped by Book', value: 'books' },
              ]}
              fullWidth
              classNames={{
                indicator: classes.indicator,
                root: classes.root,
              }}
            />
          </div>

          {/* Search mode segment control */}
          <div>
            <Group gap="lg" justify="flex-start">
              <Text size="sm" fw={500} mb={5}>
                Search Mode
              </Text>
              <Tooltip
                label="Select how terms are matched in the text."
                position="top-end"
                withArrow
              >
                <IconInfoCircle
                  size={14}
                  style={{
                    color: 'var(--mantine-color-dimmed)',
                    transform: 'translateY(-4px)',
                  }}
                />
              </Tooltip>
            </Group>
            <SegmentedControl
              value={queryType}
              onChange={setQueryType}
              data={[
                { label: 'Exact', value: 'exact' },
                { label: 'Stemmed', value: 'stemmed' },
                // { label: 'Semantic', value: 'semantic' },
              ]}
              fullWidth
              classNames={{
                indicator: classes.indicator,
                root: classes.root,
              }}
            />
          </div>

          {/* Accordion for search settings and filters */}
          <Accordion
            multiple
            value={value}
            onChange={setValue}
            className={classes.settingsAccordion}
            classNames={{
              root: classes.settingsAccordionRoot,
              panel: classes.settingsAccordionPanel,
              item: classes.settingsAccordionItem,
              control: classes.settingsAccordionControl,
            }}
          >
            {/* Filters Section */}
            <Accordion.Item value="2" className={classes.accordionItem}>
              <Accordion.Control className={classes.accordionHeader}>
                <Group justify="space-between" w="100%">
                  <Text className={classes.activeFilters} size="sm">
                    Filters
                  </Text>

                  {/* Show different content based on whether filters exist */}
                  <Group gap="xs">
                    {authors.length > 0 || collections.length > 0 || titles.length > 0 ? (
                      <>
                        <Tooltip label="Clear all filters">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="gray"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent accordion from toggling
                              setAuthors([]);
                              setCollections([]);
                              setTitles([]);
                            }}
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Text
                          className={classes.activeFilters}
                          size="xs"
                          c="dimmed"
                          pr="xl"
                          pl="md"
                        >
                          <span className={classes.filterNumber}>
                            {authors.length + collections.length + titles.length}
                          </span>
                          active filters
                        </Text>
                      </>
                    ) : (
                      <Text
                        className={classes.activeFilters}
                        size="xs"
                        c="dimmed"
                        pr="lg"
                        style={{
                          fontStyle: 'italic',
                        }}
                      >
                        No active filters
                      </Text>
                    )}
                  </Group>
                </Group>
              </Accordion.Control>

              <Accordion.Panel className={classes.accordionPanel}>
                <div className={classes.inputContainer}>
                  {!isMobile && (
                    <Text size="sm" fw={500} className={classes.fieldLabel}>
                      Titles
                    </Text>
                  )}
                  <MultiSelect
                    placeholder="Select titles"
                    data={titleOptions}
                    value={titles}
                    onChange={setTitles}
                    searchable
                    clearable
                    className={classes.fieldInput}
                    label={isMobile ? 'Titles' : undefined}
                    size="xs"
                  />
                </div>

                <div className={classes.inputContainer}>
                  {!isMobile && (
                    <Text size="sm" fw={500} className={classes.fieldLabel}>
                      Authors
                    </Text>
                  )}
                  <MultiSelect
                    placeholder="Filter by author"
                    data={authorOptions}
                    value={authors}
                    onChange={setAuthors}
                    searchable
                    clearable
                    className={classes.fieldInput}
                    label={isMobile ? 'Authors' : undefined}
                    size="xs"
                  />
                </div>

                <div className={classes.inputContainer}>
                  {!isMobile && (
                    <Text size="sm" fw={500} className={classes.fieldLabel}>
                      Collections
                    </Text>
                  )}
                  <MultiSelect
                    placeholder="Filter by collection"
                    data={collectionOptions}
                    value={collections}
                    onChange={setCollections}
                    searchable
                    clearable
                    className={classes.fieldInput}
                    label={isMobile ? 'Collections' : undefined}
                    size="xs"
                  />
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Button
            className={classes.searchButton}
            onClick={() => submitQuery(currentInput.current)}
            size="md"
            mt="sm"
            loaderProps={{ type: 'dots' }}
            leftSection={<IconSearch size={14} />}
          >
            Search Texts
          </Button>
        </Stack>
      </div>

      {/* Passage stepper: walks the hits across texts while the reader follows */}
      {hits.length > 0 && (
        <Group justify="space-between" wrap="nowrap" className={classes.hitNavigator}>
          <Text size="sm">
            {currentHitIndex === -1 ? (
              <>
                <Text component="span" c="orange.6" fw={600}>
                  {hits.length}
                </Text>{' '}
                passages
              </>
            ) : (
              <>
                Passage{' '}
                <Text component="span" c="orange.6" fw={600}>
                  {currentHitIndex + 1}
                </Text>{' '}
                of {hits.length}
              </>
            )}
          </Text>
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Previous passage">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => stepHit(-1)}
                disabled={currentHitIndex === 0}
                aria-label="Previous passage"
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Next passage">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => stepHit(1)}
                disabled={currentHitIndex === hits.length - 1}
                aria-label="Next passage"
              >
                <IconChevronRight size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      )}

      {/* Search Results Section */}
      <AdvancedSearchResults
        advancedSearchResults={advancedSearchResults}
        isLoading={isLoading}
        error={error}
        query={query}
        currentHitId={currentHitId}
        handleSearch={handleSearch}
        handleOpenText={handleOpenText}
      />
    </div>
  );
}

export default AdvancedSearch;
