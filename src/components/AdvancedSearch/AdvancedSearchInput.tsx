import React from 'react';
import { TextInput, Loader, ActionIcon } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useState, MutableRefObject } from 'react';

interface SearchInputProps {
  handleSearch: (newQuery: string) => void;
  isLoading: boolean;
  classes: any;
  setQuery: (value: string) => void;
  currentInput: MutableRefObject<string | null>;
}

const SearchInputComponent = React.memo(
  ({ handleSearch, isLoading, classes, setQuery, currentInput }: SearchInputProps) => {
    const [inputValue, setInputValue] = useState('');

    return (
      <TextInput
        label="Search Query"
        placeholder="Enter Sanskrit terms or phrase"
        value={inputValue}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => {
          const value = event.currentTarget.value;
          setInputValue(value);
          currentInput.current = value;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            setQuery(inputValue);
          }
        }}
        className={classes.control}
        classNames={{ input: classes.mainSearchInput }}
        mb="md"
        rightSection={
          isLoading ? (
            <Loader type="dots" size="xs" color="rgba(191, 191, 191, 1)" />
          ) : (
            <ActionIcon
              onClick={() => setQuery(inputValue)}
              variant="subtle"
              color="gray"
              aria-label="Search"
            >
              <IconSearch size={16} />
            </ActionIcon>
          )
        }
        rightSectionWidth={42} // Ensure enough space for the button
      />
    );
  }
);

export default SearchInputComponent;
