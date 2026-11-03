import React, { useEffect, useState } from 'react';
import {
  Title,
  Text,
  Paper,
  Button,
  Stack,
  Group,
  Badge,
  ActionIcon,
  Tooltip,
  Accordion,
  Divider,
  Skeleton,
} from '@mantine/core';
import { IconBook, IconExternalLink } from '@tabler/icons-react';
import { BookResult, SearchResult, SegmentResult } from '../../types/searchTypes';
import HighlightText from '../../utils/HighlightText';
import classes from './AdvancedSearch.module.css';

interface AdvancedSearchResultsProps {
  advancedSearchResults: SearchResult | null;
  isLoading: boolean;
  error: string | null;
  query: string;
  /** The hit open in the reader: marked in the list and kept in view */
  currentHitId: string | null;
  handleSearch: () => void;
  handleOpenText: (textId: string, title: string, segmentNumber?: number, hitId?: string) => void;
}

/** A click on a card opens it, unless the click was selecting text to copy */
const isTextSelection = () => (window.getSelection()?.toString().length ?? 0) > 0;

function AdvancedSearchResults({
  advancedSearchResults,
  isLoading,
  error,
  query,
  currentHitId,
  handleSearch,
  handleOpenText,
}: AdvancedSearchResultsProps) {
  // Helper function to get color based on relevance score
  function getRankColor(rank: number): string {
    if (rank >= 0.8) return 'green';
    if (rank >= 0.6) return 'teal';
    if (rank >= 0.4) return 'blue';
    if (rank >= 0.2) return 'violet';
    return 'gray';
  }

  // Books opened by hand, plus the one holding the current hit
  const [openBooks, setOpenBooks] = useState<string[]>([]);

  useEffect(() => {
    setOpenBooks([]);
  }, [advancedSearchResults]);

  useEffect(() => {
    if (!currentHitId || advancedSearchResults?.type !== 'books') return;
    const book = advancedSearchResults.results.find((candidate) =>
      candidate.segments.some((segment) => segment.segment_id === currentHitId)
    );
    if (book) {
      setOpenBooks((open) => (open.includes(book.text_id) ? open : [...open, book.text_id]));
    }
  }, [currentHitId, advancedSearchResults]);

  // Once the accordion has opened (200ms), bring the current card into view
  useEffect(() => {
    if (!currentHitId) return undefined;
    const timer = setTimeout(() => {
      const selector = `[data-hit-id="${currentHitId.replace(/["\\]/g, '\\$&')}"]`;
      document.querySelector(selector)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 250);
    return () => clearTimeout(timer);
  }, [currentHitId]);

  if (!advancedSearchResults && !isLoading && !error) {
    return null;
  }

  return (
    <Paper radius="sm" className={classes.resultsContainer} mt="md">
      <Title order={3} mb="md" className={classes.title}>
        Search Results
      </Title>
      {isLoading && (
        <>
          <Skeleton height={14} mt="lg" width="70%" mb="md" radius="sm" />
          <Skeleton height={50} radius="sm" mb="lg" />
          <Skeleton height={50} radius="sm" mb="lg" />
          <Skeleton height={50} radius="sm" mb="lg" />
          <Skeleton height={50} radius="sm" mb="lg" />
          <Skeleton height={50} radius="sm" mb="lg" />
          <Skeleton height={50} radius="sm" mb="lg" />
          <Skeleton height={50} radius="sm" mb="lg" />
          <Skeleton height={50} radius="sm" mb="lg" />
          <Skeleton height={50} radius="sm" mb="lg" />
          <Skeleton height={50} radius="sm" mb="lg" />
        </>
      )}

      {error && (
        <div className={classes.errorContainer}>
          <Text c="red" mb="xs">
            Error: {error}
          </Text>
          <Button variant="outline" color="red" onClick={handleSearch}>
            Try Again
          </Button>
        </div>
      )}

      {advancedSearchResults && !isLoading && !error && (
        <>
          {/* Display segment results - CARD-BASED DESIGN */}
          {advancedSearchResults.type === 'segments' &&
            advancedSearchResults.results.length > 0 && (
              <div className={classes.segmentResults}>
                <Text size="sm" mb="md">
                  Found{' '}
                  <Text component="span" c="orange.6" fw={600}>
                    {advancedSearchResults.results.length}
                  </Text>
                  {' matching segments'}
                </Text>

                <Stack gap="md">
                  {advancedSearchResults.results.map((segment: SegmentResult) => {
                    const open = () =>
                      handleOpenText(
                        segment.segment_id.split(':')[0],
                        segment.title || 'Unknown Text',
                        segment.segment_number,
                        segment.segment_id
                      );
                    return (
                      <Paper
                        key={segment.segment_id}
                        p="md"
                        data-hit-id={segment.segment_id}
                        className={`${classes.segmentCard} ${
                          segment.segment_id === currentHitId ? classes.currentHit : ''
                        }`}
                        onClick={() => {
                          if (!isTextSelection()) open();
                        }}
                      >
                        {/* Header with metadata - using the same structure as book results */}
                        <Group justify="space-between" align="flex-start" w="100%" mb="xs">
                          {/* Left content with title and metadata */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Title row */}
                            <Text
                              className={classes.titleText}
                              title={segment.title || 'Unknown Text'} // Show full title on hover
                            >
                              {segment.title || 'Unknown Text'}
                            </Text>

                            {/* Author/segment row */}
                            <Group mt={4} style={{ whiteSpace: 'nowrap' }}>
                              {segment.author && (
                                <Text size="xs" c="dimmed">
                                  {segment.author}
                                </Text>
                              )}
                              {segment.author && (
                                <Text size="xs" c="dimmed" mx={4}>
                                  •
                                </Text>
                              )}
                              <Text size="xs" className={classes.segmentNumber}>
                                Segment {segment.segment_number}
                              </Text>
                            </Group>
                          </div>

                          {/* Right side with badge and icon */}
                          <Group gap="sm" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                            <Badge variant="outline" color={getRankColor(segment.rank)}>
                              {parseFloat(segment.rank.toFixed(3))} rank
                            </Badge>
                            <Tooltip label="Open full text">
                              <ActionIcon
                                className={classes.bookIcon}
                                variant="subtle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  open();
                                }}
                              >
                                <IconBook size={18} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Group>

                        {/* Segment content with highlighted query - add visual separation */}
                        <div className={classes.segmentContent}>
                          <Divider my="xs" />
                          <HighlightText isSearchResult text={segment.text} query={query} />
                        </div>
                      </Paper>
                    );
                  })}
                </Stack>
              </div>
            )}

          {/* Display book results - ACCORDION DESIGN */}
          {advancedSearchResults.type === 'books' && advancedSearchResults.results.length > 0 && (
            <div className={classes.bookResults}>
              <Text size="sm" mb="md">
                Found{' '}
                <Text component="span" c="orange.6" fw={600}>
                  {advancedSearchResults.results.length}
                </Text>
                {' books with matching content'}
              </Text>

              <Accordion
                multiple
                value={openBooks}
                onChange={setOpenBooks}
                variant="separate"
                classNames={{
                  root: classes.resultAccordionRoot,
                  panel: classes.resultAccordionPanel,
                  item: classes.resultAccordionItem,
                  control: classes.resultAccordionControl,
                }}
              >
                {advancedSearchResults.results.map((book: BookResult) => (
                  <Accordion.Item
                    key={book.text_id}
                    value={book.text_id}
                    className={classes.resultItem}
                  >
                    <Accordion.Control>
                      <Group justify="space-between" align="flex-start" w="100%">
                        {/* Left content with title info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Title row */}
                          <Group align="center" style={{ whiteSpace: 'nowrap' }}>
                            <Text
                              className={`${classes.titleText} ${(book.title?.length ?? 0) > 40 ? classes.longTitle : classes.normalTitle}`}
                              title={book.title || 'Unknown Text'} // Show full title on hover
                            >
                              {book.title || 'Unknown Text'}
                            </Text>
                          </Group>

                          {/* Author/collection row */}
                          <Group mt={4} style={{ whiteSpace: 'nowrap' }}>
                            {book.author && (
                              <Text size="xs" c="dimmed">
                                {book.author}
                              </Text>
                            )}
                            <Text size="xs" className={classes.bookCollection}>
                              {book.collection}
                            </Text>
                          </Group>
                        </div>

                        {/* Right side with badge and icon */}
                        <Group gap="sm" mt="xs" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                          <Badge size="xs" variant="outline" color="orange">
                            {book.occurrence_count} matches
                          </Badge>
                          <Tooltip label="Open full text">
                            <ActionIcon
                              className={classes.bookIcon}
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenText(book.text_id, book.title);
                              }}
                              size="md"
                            >
                              <IconBook size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                    </Accordion.Control>

                    <Accordion.Panel className={classes.resultPanel}>
                      <Stack gap="sm">
                        {book.segments.map((segment) => {
                          const open = () =>
                            handleOpenText(
                              book.text_id,
                              book.title,
                              segment.segment_number,
                              segment.segment_id
                            );
                          return (
                            <Paper
                              key={segment.segment_id}
                              p="sm"
                              withBorder
                              data-hit-id={segment.segment_id}
                              className={`${classes.segmentDetail} ${
                                segment.segment_id === currentHitId ? classes.currentHit : ''
                              }`}
                              onClick={() => {
                                if (!isTextSelection()) open();
                              }}
                            >
                              <Group
                                justify="space-between"
                                mb="xs"
                                className={classes.bookSegment}
                              >
                                <Text size="xs" fw={500}>
                                  Segment {segment.segment_number}
                                </Text>
                                <Group justify="space-between">
                                  <Badge
                                    variant="outline"
                                    size="sm"
                                    color={getRankColor(segment.rank)}
                                  >
                                    {parseFloat(segment.rank.toFixed(3))} rank
                                  </Badge>
                                  <Tooltip label="Go to this segment">
                                    <ActionIcon
                                      className={classes.bookIcon}
                                      variant="subtle"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        open();
                                      }}
                                    >
                                      <IconExternalLink size={18} />
                                    </ActionIcon>
                                  </Tooltip>
                                </Group>
                              </Group>

                              <HighlightText isSearchResult text={segment.text} query={query} />
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          )}

          {/* No results found */}
          {advancedSearchResults &&
            advancedSearchResults.results &&
            advancedSearchResults.results.length === 0 && (
              <Text className={classes.errorText} my="xl">
                No results found for your search criteria. Try different search terms or filters.
              </Text>
            )}
        </>
      )}
    </Paper>
  );
}

export default AdvancedSearchResults;
