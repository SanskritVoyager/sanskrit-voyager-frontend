import React, { MutableRefObject, useEffect, useState } from 'react';
import { TextInput, Loader, ActionIcon } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

interface SearchInputProps {
  /** Runs a search for the typed text (Enter or the search icon) */
  onSubmit: (query: string) => void;
  isLoading: boolean;
  classes: any;
  /** The latest typed text, for the Search button rendered by the parent */
  currentInput: MutableRefObject<string | null>;
  autofocus?: boolean;
  /** The query already searched (from the URL); shown until the user types */
  initialQuery?: string;
}

const SearchInputComponent = React.memo(
  ({
    onSubmit,
    isLoading,
    classes,
    currentInput,
    autofocus,
    initialQuery = '',
  }: SearchInputProps) => {
    const [inputValue, setInputValue] = useState(initialQuery);

    // Back/forward or a shared link can change the query under the panel
    useEffect(() => {
      setInputValue(initialQuery);
      currentInput.current = initialQuery;
    }, [initialQuery]);

    return (
      <TextInput
        label="Search Query"
        placeholder="Enter Sanskrit terms or phrase"
        value={inputValue}
        autoCapitalize="off"
        autoCorrect="off"
        autoFocus={autofocus}
        spellCheck={false}
        onChange={(event) => {
          const { value } = event.currentTarget;
          setInputValue(value);
          currentInput.current = value;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit(inputValue);
        }}
        className={classes.control}
        classNames={{ input: classes.mainSearchInput }}
        mb="md"
        rightSection={
          isLoading ? (
            <Loader type="dots" size="xs" color="rgba(191, 191, 191, 1)" />
          ) : (
            <ActionIcon
              onClick={() => onSubmit(inputValue)}
              variant="subtle"
              color="gray"
              aria-label="Search"
            >
              <IconSearch size={16} />
            </ActionIcon>
          )
        }
        rightSectionWidth={42}
      />
    );
  }
);

export default SearchInputComponent;
