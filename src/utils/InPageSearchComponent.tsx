import React from 'react';
import { Paper, TextInput, ActionIcon, Group, Text, Transition } from '@mantine/core';
import { useDebouncedValue, getHotkeyHandler } from '@mantine/hooks';
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
  
  // Local state for immediate input updates (keeps typing responsive)
  const [localQuery, setLocalQuery] = React.useState(searchQuery);
  
  // Debounce the local query before sending to parent
  const [debouncedQuery] = useDebouncedValue(localQuery, 300);
  
  // Sync debounced value to parent
  React.useEffect(() => {
    if (debouncedQuery !== searchQuery) {
      setSearchQuery(debouncedQuery);
    }
  }, [debouncedQuery, setSearchQuery, searchQuery]);
  
  // Sync parent query to local state when it changes externally
  React.useEffect(() => {
    if (searchQuery !== localQuery && searchQuery === '') {
      // Only sync when parent clears the search
      setLocalQuery(searchQuery);
    }
  }, [searchQuery]);

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
          <Group gap="xs" wrap="nowrap" pr={8}>
            <TextInput
              ref={inputRef}
              placeholder="Search in text..."
              value={localQuery}
              autoFocus
              onChange={(e) => setLocalQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              className={classes.searchInput}
              onKeyDown={getHotkeyHandler([
                    ['Enter', () => {
                    onNext();
                    }],
                    ['shift+Enter', () => {
                    onPrevious();
                    }],
                ])}
            />
            
            {/* Show counter if a search is active */}
            
              <Text size="sm" c="dimmed" className={classes.matchCounter}>
                {totalMatches > 0 ? `${currentMatchIndex + 1} / ${totalMatches}` : '0 / 0'}
              </Text>
            
            
            {/* Only show navigation arrows if there are matches */}
            
              <>
                <ActionIcon
                  className ={ classes.upIcon }
                  variant="subtle"
                  onClick={onPrevious}
                  disabled={totalMatches === 0}
                  title="Previous match (Shift+Enter)"
                >
                  <IconChevronUp size={16} />
                </ActionIcon>
                
                <ActionIcon
                  className= { classes.downIcon }
                  variant="subtle"
                  onClick={onNext}
                  disabled={totalMatches === 0}
                  title="Next match (Enter)"
                >
                  <IconChevronDown size={16} />
                </ActionIcon>
              </>
            
            
            <ActionIcon
              variant="subtle"
              onClick={onClose}
              title="Close search (Esc)"
              className={classes.closeButton}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Paper>
      )}
    </Transition>
  );
};