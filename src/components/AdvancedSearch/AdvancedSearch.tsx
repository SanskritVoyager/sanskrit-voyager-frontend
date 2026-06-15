import React, { useEffect, useState, useRef } from 'react';
import {
  SegmentedControl,
  TextInput,
  MultiSelect,
  Button,
  Stack,
  Title,
  Text,
  Paper,
  Loader,
  Accordion,
  Group,
  Badge,
  Divider,
  ActionIcon,
  Box,
  Collapse,
  useMantineTheme,
  Tooltip,
  Anchor
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSearch,
  IconBook,
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconInfoCircle,
  IconChevronUp,
  IconFilter,
  IconAdjustments,
  IconX,
} from '@tabler/icons-react';
import classes from './AdvancedSearch.module.css';
import { BookResult, SearchResult, SegmentResult } from '../../types/searchTypes';
import HighlightText from '../../utils/HighlightText';
import SearchInputComponent from './AdvancedSearchInput';
import AdvancedSearchResults from './AdvancedSearchResults';
import filterData from '../../utils/filter_data.json';

interface AdvancedSearchProps {
  advancedSearchResults: SearchResult | null;
  setAdvancedSearchResults: (results: SearchResult | null) => void;
  onSearch: (params: any) => void;
  onOpenText?: (textId: string, title: string, segmentNumber?: number) => void;
  isMobile: boolean | undefined;
  setTargetSegmentNumber: (segmentNumber: number) => void;
  query: string;
  setQuery: (query: string) => void;
  matchedBookSegments: number[];
  setMatchedBookSegments: (segments: number[]) => void;
  handleAdvancedSearch: {
    open: () => void;
    close: () => void;
    toggle: () => void;
  };
  setIsNavbarVisible: (value: boolean) => void;
}

function AdvancedSearch({
  advancedSearchResults,
  setAdvancedSearchResults,
  onSearch,
  onOpenText,
  isMobile,
  setTargetSegmentNumber,
  query,
  setQuery,
  setMatchedBookSegments,
  matchedBookSegments,
  handleAdvancedSearch,
  setIsNavbarVisible,
}: AdvancedSearchProps) {
  const [queryType, setQueryType] = useState('stemmed');
  const [filterMode, setFilterMode] = useState('include');
  const [searchType, setSearchType] = useState<'segments' | 'books'>('books');
  const [authors, setAuthors] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [limit, setLimit] = useState(500);

  // State for handling the search process
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<string[]>([]);

  const currentInput = useRef<string | null>(null);

  // Mock data for dropdowns - replace with actual data from API

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

  const updateQuery = () => {
    setQuery(currentInput.current || '');
  };

  // Function to handle the search API call
  const handleSearch = async () => {
    // Reset previous search state
    setIsLoading(true);
    setError(null);
    setAdvancedSearchResults(null);

    // Create the search parameters with type declaration
    const searchParams: {
      query: string;
      query_type: string;
      search_type: 'segments' | 'books';
      limit: number;
      authors?: string[];
      collections?: string[];
      text_ids?: string[];
    } = {
      query: query,
      query_type: queryType,
      search_type: searchType,
      authors: authors,
      text_ids: titles,
      collections: collections,
      limit: limit,
      // add references here to author, collection, and text id, change the API call as well
    };

    try {
      // Make the API request
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

      // Set the search results based on the search type
      setAdvancedSearchResults({
        type: searchType,
        results: data,
      });

      // Also pass the results to the parent component
      onSearch(data);
      // console.log('Search results:', data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (query.trim()) {
      // Only run search if query has content
      // console.log('query launching', query);
      handleSearch();
    }
  }, [query, searchType]);

  // Handle clicking on a text to open it
  // here add two things: close the modal and close the navbar as well if it's on mobile
  // TODO

  const handleOpenText = (
    textId: string,
    title: string,
    segmentNumber?: number,
    matchedSegments?: number[]
  ) => {
    if (onOpenText) {
      // Clear previous markers first, before setting new ones
      setMatchedBookSegments([]);
      
      if (advancedSearchResults) {
        if (advancedSearchResults.type === 'books') {
          // Find the book in search results
          const book = advancedSearchResults.results.find((b: BookResult) => b.text_id === textId);
          if (book) {
            // Extract all segment numbers from this book
            setMatchedBookSegments(book.segments.map((segment) => segment.segment_number));
          }
        } else if (advancedSearchResults.type === 'segments') {
          // Find all segments that belong to this text
          setMatchedBookSegments(
            advancedSearchResults.results
              .filter((seg: SegmentResult) => seg.segment_id.split(':')[0] === textId)
              .map((seg: SegmentResult) => seg.segment_number)
          );
        }
      }
      // console.log('matched_segments', matchedBookSegments);
      setTargetSegmentNumber(segmentNumber || 0);
      onOpenText(textId, title, segmentNumber);
      handleAdvancedSearch.close();
      // console.log(segmentNumber);
      isMobile ? setIsNavbarVisible(false) : null;
    }
  };

  return (
    <div className={classes.pageWrapper}>
      <div
          className={classes.optionsContainer}
        >
        <Title order={2} mb="xs" className={classes.title}>
          Sanskrit Corpus Search
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Search across the  Sanskrit collection from{' '} 
          
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

        {/* Search bar at the top */}
        <SearchInputComponent
          handleSearch={handleSearch}
          isLoading={isLoading}
          classes={classes}
          setQuery={setQuery}
          currentInput={currentInput}
          
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
              onChange={(value) => setSearchType(value as 'segments' | 'books')}
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
                // { label: 'Neural', value: 'neural' },
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
                {/* <SegmentedControl
                  value={filterMode}
                  onChange={setFilterMode}
                  data={[
                    { label: 'Include Selected', value: 'include' },
                    { label: 'Exclude Selected', value: 'exclude' },
                  ]}
                  fullWidth
                  classNames={{
                    indicator: classes.indicator,
                    root: classes.root
                  }}
                  mb={16}
                  mt={16}
                /> */}

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
            onClick={() => updateQuery()}
            size="md"
            mt="sm"
            loaderProps={{ type: 'dots' }}
            leftSection={<IconSearch size={14} />}
          >
            Search Texts
          </Button>
        </Stack>
      </div>

      {/* Search Results Section */}
      <AdvancedSearchResults
        advancedSearchResults={advancedSearchResults}
        isLoading={isLoading}
        error={error}
        query={query}
        handleSearch={handleSearch}
        handleOpenText={handleOpenText}
      />
    </div>
  );
}

export default AdvancedSearch;
