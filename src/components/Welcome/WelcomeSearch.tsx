import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Combobox, Group, Kbd, Text, TextInput, rem, useCombobox } from '@mantine/core';
import { IconBook, IconListSearch, IconSearch, IconVocabulary } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { loadTitles, toSlug } from '@/utils/bookSlug';
import { loadDictionaryKeys } from '@/utils/dictionaryKeys';
import classes from './Welcome.module.css';

interface WelcomeSearchProps {
  onLookupWord: (word: string) => void;
  onSearchTexts: (query: string) => void;
}

interface Book {
  original: string;
  label: string;
  folded: string;
}

interface Headword {
  word: string;
  folded: string;
}

const BOOK_LIMIT = 5;
const HEADWORD_LIMIT = 5;
// The dropdown opens below the input, shrinking to the space there, and above
// it only when less than this is left below
const MIN_HEIGHT_BELOW = 200;

const iconStyle = { width: rem(16), height: rem(16), flex: '0 0 auto' };

// `Kṛṣṇa` and `krsna` both become `krsna`
const fold = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// 'sa_kṣemendra-garbhāvakrāntyavadāna' → 'Kṣemendra Garbhāvakrāntyavadāna'
const formatTitle = (title: string) =>
  title
    .replace(/^(sa|ta)_/, '')
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

// Folding all headwords takes a noticeable moment, so do it once per session
// rather than every time the welcome screen mounts.
let headwordIndex: Headword[] | null = null;

const loadHeadwordIndex = async () => {
  if (!headwordIndex) {
    const keys = await loadDictionaryKeys();
    headwordIndex = keys.map((word) => ({ word, folded: fold(word) }));
  }
  return headwordIndex;
};

// Titles starting with the query first, then a later word starting with it, then any substring
const matchBooks = (books: Book[], q: string) => {
  const ranked: Book[][] = [[], [], []];
  for (const book of books) {
    if (book.folded.startsWith(q)) ranked[0].push(book);
    else if (book.folded.includes(` ${q}`)) ranked[1].push(book);
    else if (book.folded.includes(q)) ranked[2].push(book);
  }
  return ranked.flat().slice(0, BOOK_LIMIT);
};

// Every diacritic variant of the query ('sa' → śa, ṣa, sa, sā), then headwords it begins
const matchHeadwords = (headwords: Headword[], q: string) => {
  const exact = new Set<string>();
  const prefix = new Set<string>();
  for (const { word, folded } of headwords) {
    if (folded === q) exact.add(word);
    else if (prefix.size < HEADWORD_LIMIT && folded.startsWith(q)) prefix.add(word);
  }
  return { exact: [...exact], prefix: [...prefix] };
};

export function WelcomeSearch({ onLookupWord, onSearchTexts }: WelcomeSearchProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [headwords, setHeadwords] = useState<Headword[]>([]);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const combobox = useCombobox({
    onDropdownOpen: () => {
      const bottom = inputRef.current?.getBoundingClientRect().bottom ?? 0;
      setPosition(window.innerHeight - bottom >= MIN_HEIGHT_BELOW ? 'bottom' : 'top');
    },
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  useEffect(() => {
    loadTitles()
      .then((titles) => {
        const formatted = titles.map((original) => {
          const label = formatTitle(original);
          return { original, label, folded: fold(label) };
        });
        setBooks(formatted.sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch((error) => console.error('Error loading titles:', error));

    loadHeadwordIndex()
      .then(setHeadwords)
      .catch((error) => console.error('Error loading dictionary keys:', error));
  }, []);

  const trimmed = query.trim();

  const { bookMatches, headwordMatches, defaultValue } = useMemo(() => {
    const q = fold(trimmed);
    if (!q) {
      return { bookMatches: [] as Book[], headwordMatches: [] as string[], defaultValue: null };
    }

    let words = matchHeadwords(headwords, q);
    if (words.exact.length === 0 && words.prefix.length === 0 && q.includes('sh')) {
      words = matchHeadwords(headwords, q.replace(/sh/g, 's'));
    }

    // Enter without a highlighted option opens an exact title, else looks up an
    // exact headword (the variant typed, if there is one), else searches the texts
    const exactBook = books.find((book) => book.folded === q);
    const typed = trimmed.toLowerCase();
    const exactWord = words.exact.includes(typed) ? typed : words.exact[0];
    let fallback = 'search';
    if (exactBook) fallback = `book:${exactBook.original}`;
    else if (exactWord) fallback = `word:${exactWord}`;

    return {
      bookMatches: matchBooks(books, q),
      headwordMatches: [...words.exact, ...words.prefix].slice(0, HEADWORD_LIMIT),
      defaultValue: fallback,
    };
  }, [trimmed, books, headwords]);

  // The free lookup covers inflected forms and phrases the headword list lacks;
  // it is hidden when it would repeat a headword row
  const showLookup = !headwordMatches.includes(trimmed.toLowerCase());

  const submit = (value: string) => {
    combobox.closeDropdown();
    const separator = value.indexOf(':');
    const kind = separator === -1 ? value : value.slice(0, separator);
    const target = value.slice(separator + 1);
    if (kind === 'book') navigate(`/book/${toSlug(target)}`);
    else if (kind === 'word') onLookupWord(target);
    else if (kind === 'lookup') onLookupWord(trimmed);
    else if (kind === 'search') onSearchTexts(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // An option highlighted with the arrow keys is submitted by the combobox itself
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (combobox.dropdownOpened && combobox.getSelectedOptionIndex() !== -1) return;
    if (defaultValue) {
      event.preventDefault();
      submit(defaultValue);
    }
  };

  const renderOption = (value: string, icon: React.ReactNode, label: React.ReactNode) => (
    <Combobox.Option
      value={value}
      key={value}
      className={classes.option}
      data-default={value === defaultValue || undefined}
    >
      <Group gap="xs" wrap="nowrap">
        {icon}
        <Text size="sm" className={classes.optionLabel}>
          {label}
        </Text>
        {value === defaultValue && (
          <Kbd size="xs" className={classes.enterHint}>
            Enter
          </Kbd>
        )}
      </Group>
    </Combobox.Option>
  );

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={submit}
      position={position}
      // Mantine flips before sizing, so flip by hand above and let size cap the height
      middlewares={{ flip: false, shift: true, size: { padding: 8 } }}
    >
      <Combobox.Target>
        <TextInput
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            combobox.openDropdown();
            combobox.resetSelectedOption();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          onKeyDown={handleKeyDown}
          size="md"
          classNames={{ input: classes.searchInput }}
          placeholder="Search books, dictionary entries, passages"
          aria-label="Search books, the dictionary and all texts"
          leftSection={<IconSearch style={iconStyle} stroke={1.5} />}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={!trimmed} className={classes.dropdown}>
        <Combobox.Options>
          {bookMatches.length > 0 && (
            <Combobox.Group label="Books">
              {bookMatches.map((book) =>
                renderOption(
                  `book:${book.original}`,
                  <IconBook style={iconStyle} stroke={1.5} />,
                  book.label
                )
              )}
            </Combobox.Group>
          )}

          {headwordMatches.length > 0 && (
            <Combobox.Group label="Dictionary">
              {headwordMatches.map((word) =>
                renderOption(
                  `word:${word}`,
                  <IconVocabulary style={iconStyle} stroke={1.5} />,
                  word
                )
              )}
            </Combobox.Group>
          )}

          <Combobox.Group label="Search">
            {renderOption(
              'search',
              <IconListSearch style={iconStyle} stroke={1.5} />,
              <>Search all texts for “{trimmed}”</>
            )}
            {showLookup &&
              renderOption(
                'lookup',
                <IconVocabulary style={iconStyle} stroke={1.5} />,
                <>Look up “{trimmed}” in the dictionaries</>
              )}
          </Combobox.Group>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default WelcomeSearch;
