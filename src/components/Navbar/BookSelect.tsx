import React, { useState, useEffect } from 'react';
import { Select, ComboboxItem, OptionsFilter } from '@mantine/core';

interface BookSelectProps {
  setBookTitle: (value: string | null) => void;
  bookTitle: string | null;
}

// BookTitle interface defines the structure of our processed book data
interface BookTitle {
  // Value is stored in normalized form (no diacritics, spaces instead of underscores)
  value: string;
  // Label is the human-readable form with proper capitalization
  label: string;
  // Original filename as it exists in the system
  original: string;
}

// Utility function to properly capitalize words in a title
function capitalizeWords(string: string) {
  return string
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Utility function to remove diacritical marks from text
function removeDiacritics(str: string | null) {
  if (str === null) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function BookSelect({ setBookTitle, bookTitle }: BookSelectProps) {
  // Store the processed book titles
  const [bookTitlesList, setBookTitlesList] = useState<BookTitle[]>([]);
  // Track the currently selected value
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  // Simplified filter function that works with pre-normalized values
  const normalisedFilter: OptionsFilter = ({ options, search }) => {
    const normalizedSearch = removeDiacritics(search.toLowerCase().trim());

    return options.filter((option): option is ComboboxItem => {
      // First check if this is a group
      if ('group' in option) {
        return false; // We don't handle groups in our case
      }

      // Now TypeScript knows this is a ComboboxItem with a value
      return (
        typeof option.value === 'string' && option.value.toLowerCase().includes(normalizedSearch)
      );
    });
  };

  // Load and process book titles when component mounts
  useEffect(() => {
    fetch('/resources/books/titles.json')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch titles.json');
        return response.json();
      })
      .then((data: string[]) => {
        // Process each title once during initial load
        const formattedData = data.map((title: string) => {
          // Remove special prefixes and replace special characters
          const displayText = title
            .replace(/^sa/, '') // Remove 'sa' prefix
            .replace(/^ta/, '') // Remove 'ta' prefix
            .replace(/_/g, ' ') // Replace underscores with spaces
            .replace(/-/g, ' '); // Replace hyphens with spaces

          // Create a single processed entry for each book
          return {
            // Store normalized version for searching
            value: removeDiacritics(displayText),
            // Store properly formatted version for display
            label: capitalizeWords(displayText),
            // Keep original filename for file operations
            original: title,
          };
        });

        // Sort books alphabetically by display label
        setBookTitlesList(formattedData.sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch((error) => {
        console.error('Error loading titles:', error);
      });
  }, []);

  // Handle selection of a book
  const selectBook = (value: string | null) => {
    const selectedBook = bookTitlesList.find((book) => book.value === value);
    // Pass the original filename back to parent component
    setBookTitle(selectedBook?.original ?? null);
    // Update local selected value state
    setSelectedValue(value);
  };

  return (
    <Select
      data={bookTitlesList.map(({ value, label }) => ({ value, label }))}
      value={selectedValue}
      label="Select a book to import"
      placeholder="Pick a book to import"
      searchable
      nothingFoundMessage="Nothing found..."
      onChange={selectBook}
      filter={normalisedFilter}
      style={{ width: '100%', paddingTop: 5, paddingBottom: 5 }}
      autoCorrect="off"
      spellCheck={false}
    />
  );
}

export default BookSelect;
