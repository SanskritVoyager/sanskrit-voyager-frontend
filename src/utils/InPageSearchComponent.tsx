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
          <Group gap={4} wrap="nowrap" pl={4}>
            <TextInput
              variant='unstyled'
              ref={inputRef}
              value={localQuery}
              placeholder="Search in text..."
              autoFocus
              onChange={(e) => setLocalQuery(e.currentTarget.value)}
              className={classes.searchInput}
              rightSection = {
                <Text size="sm" c="dimmed" className={classes.matchCounter}>
                {totalMatches > 0 ? `${currentMatchIndex + 1} / ${totalMatches}` : '0 / 0'}
              </Text>
              }
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
            
              
            
            
            {/* Only show navigation arrows if there are matches */}
            
              <>
                <ActionIcon
                  className ={`${classes.upIcon} ${totalMatches === 0? classes.disabledIcon : ''}`}
                  variant="subtle"
                  onClick={totalMatches === 0 ? undefined : onPrevious}
                  title="Previous match (Shift+Enter)"
                >
                  <IconChevronUp size={16} />
                </ActionIcon>
                
                <ActionIcon
                  className= {`${classes.downIcon} ${totalMatches === 0? classes.disabledIcon : ''}`}
                  variant="subtle"
                  onClick={totalMatches === 0 ? undefined : onNext}
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