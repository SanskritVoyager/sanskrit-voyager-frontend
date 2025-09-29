import React from 'react';
import { Paper, TextInput, ActionIcon, Group, Text, Transition } from '@mantine/core';
import { IconSearch, IconX, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import classes from './InPageSearch.module.css';

interface InPageSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isVisible: boolean;
  currentMatchIndex: number;
  totalMatches: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const InPageSearch: React.FC<InPageSearchProps> = ({
  searchQuery,
  setSearchQuery,
  isVisible,
  currentMatchIndex,
  totalMatches,
  onClose,
  onNext,
  onPrevious
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when search becomes visible
  React.useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isVisible]);

  return (
    <Transition
      mounted={isVisible}
      transition="slide-down"
      duration={200}
      timingFunction="ease"
    >
      {(styles) => (
        <Paper
          style={styles}
          className={classes.searchContainer}
          shadow="md"
          p="xs"
          radius="md"
        >
          <Group gap="xs" wrap="nowrap">
            <TextInput
              ref={inputRef}
              placeholder="Search in text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              rightSection={
                searchQuery && (
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    onClick={() => setSearchQuery('')}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                )
              }
              className={classes.searchInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    onPrevious();
                  } else {
                    onNext();
                  }
                }
              }}
            />
            
            {totalMatches > 0 && (
              <>
                <Text size="sm" c="dimmed" className={classes.matchCounter}>
                  {currentMatchIndex + 1} / {totalMatches}
                </Text>
                
                <ActionIcon
                  variant="subtle"
                  onClick={onPrevious}
                  disabled={totalMatches === 0}
                  title="Previous match (Shift+Enter)"
                >
                  <IconChevronUp size={16} />
                </ActionIcon>
                
                <ActionIcon
                  variant="subtle"
                  onClick={onNext}
                  disabled={totalMatches === 0}
                  title="Next match (Enter)"
                >
                  <IconChevronDown size={16} />
                </ActionIcon>
              </>
            )}
            
            <ActionIcon
              variant="subtle"
              onClick={onClose}
              title="Close search (Esc)"
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Paper>
      )}
    </Transition>
  );
};