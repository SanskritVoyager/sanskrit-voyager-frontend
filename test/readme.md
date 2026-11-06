# Reader regression tests

`ClickableSimpleBooks.sections.test.tsx` renders the actual book component and table of contents. It checks the repair contract's four section headings and anchor navigation, repeated labels with unique IDs, opener/colophon block rendering, preservation of 100 aligned source pairs and segment numbers, translation-only nested sections, and legacy headings. The dictionary portal is mocked because dictionary lookup is outside these boundary checks.

Run from the frontend root with `node node_modules/vitest/vitest.mjs run test/ClickableSimpleBooks.sections.test.tsx --cache false`.

Set `REPAIRED_BOOK_TEST_PATH` to the absolute path of the repaired Daśabalasūtra JSON to also run the actual-book integration check (four headings, three openers, three colophons, 100 populated pairs, and no input mutation). This optional check leaves corpus data outside the code repository.

## Search highlighting

Search replaced mark.js with `src/utils/searchMatcher.ts`, React `<mark>`s in `HighlightText` and the CSS Custom Highlight API for in-page search.

- `searchMatcher.test.ts` checks accent-insensitive matching on IAST, ISO 15919, Vedic accents and decomposed text, unchanged Devanagari, whole-word matches that stop at punctuation and dandas, phrases, empty queries, and DOM matching across elements with ignored subtrees skipped.
- `HighlightText.test.tsx` checks the marks, unchanged text, and that a new query leaves no old marks behind.
- `InPageSearch.test.tsx` renders the book and drives the search box. It checks painted highlights, next/previous, clearing on close, reported segments, a re-run after a segment is redrawn (same match, no scroll), counting without the Highlight API, and that the search box is never matched. jsdom has no `CSS.highlights`, so the test stubs it with `vi.stubGlobal`.

Run them the same way, for example `node node_modules/vitest/vitest.mjs run test/InPageSearch.test.tsx --cache false`.

## Lookups and input_scheme

A lookup tells the backend which scheme its word is written in (`input_scheme`), because the backend's auto-detection misreads short ASCII words: SLP1 `Darma` becomes `ḍarma`, IAST `Rama` becomes `ṛama`. The selection is a `SelectedWord` (`{ word, scheme }`). Book clicks and dictionary-entry clicks take their scheme from `schemeOfSourceWord`; analysis-box clicks use the scheme the box converted into; typed searches send none.

- `transliterationSchemes.test.ts` checks the scheme names and `schemeOfSourceWord` on corpus examples: IAST (capitalized names and decomposed text included), Devanagari (Vedic accents, Macdonell's mixed tags), and the words left to auto-detection, namely ISO 15919 `ē`/`ō` and sigla or HK spellings with a capital after the first letter.
- `Api.test.ts` checks the request shapes with `fetch` stubbed: `?input_scheme=` on `/process` with the text/plain body kept (no CORS preflight), the `input_scheme` JSON field on `/process_new`, nothing sent when the scheme is unknown, and `[]` when the backend answers 400.
- `useSelectedWord.test.ts` checks that re-selecting the same word and scheme keeps the same object. The fetch and URL effects depend on that, as they did on the old string.
- `lookupParams.test.ts` checks the `?w=…&input_scheme=…&dicts=…` URL: reading older links without a scheme, unknown and lower-case schemes, dropping a stale scheme, removing the lookup, and a round trip.

Run them the same way, for example `node node_modules/vitest/vitest.mjs run test/Api.test.ts --cache false`.

## Display in the picked scheme

The reader and the dictionary panel show Sanskrit in the scheme picked in the navbar, through vidyut-lipi compiled to WebAssembly (`wasm/transliteration`). These tests load the committed build from disk with `test-utils/transliterator.ts`, because jsdom cannot fetch it.

- `transliterator.test.ts` checks the module: IAST into every selector scheme vidyut knows, Devanagari input, Kolkata (which vidyut lacks) returned unchanged, empty text, and a long text that grows the module's memory.
- `displayWord.test.ts` checks the display rules.
  - Words: the preparation vidyut needs (lowercasing `Kṛṣṇa`, decomposed text, `ṁ`, the diaeresis `praüga` → `प्रउग` not `प्रौग`, dictionary accents), Kolkata derived from IAST, and words left as stored.
  - Tokens of running text: punctuation kept, numbers and references kept (vidyut would give `१।१`), sigla, enumerators and lacunae kept.
  - English lines, on corpus examples: English found, and Sanskrit read as Sanskrit where it shares words with English (`'to`, the privative `a-`, `in`, `are`).
  - Headings: Sanskrit ones convert, while English ones and plain ASCII ones stay.
- `useTransliterationScheme.test.ts` checks that the picked scheme survives a reload: the saved scheme is there on the very first render (no IAST first), a new pick is saved, a saved value is read in any case, an unknown one gives IAST, and blocked storage (a private window) still lets the user pick.
- `dictionaryDisplay.test.tsx` renders `DictionaryEntry` and `InflectionTable` inside the provider. It checks:
  - converted Sanskrit with the English untouched, and a click that still looks up the stored IAST word;
  - capitalized `<s1>` names;
  - the `<b>` headword that starts a Grassmann or Edgerton entry (and no other `<b>`);
  - Macdonell's romanization shown as printed beside the converted Devanagari;
  - IAST shown as stored, and the inflection table's hook order across a render without forms.

  Its `vi.mock` factory reads the build through `test-utils/transliteratorWasm.ts`, which imports nothing from `src`: importing the mocked module from inside its own factory deadlocks the test.
- `ClickableSimpleBooks.transliteration.test.tsx` renders a small book inside the provider. It checks:
  - converted words, and clicks that pass the stored word;
  - a translation's `<s>` terms;
  - English lines, English and ASCII headings, notes and verse numbers kept as stored;
  - Sanskrit headings and their table of contents entries converted;
  - each distinct word converted once per scheme (the cache);
  - the stored text back when IAST is picked;
  - in-page search finding converted words by an IAST or a Devanagari query.
- `searchMatcher.test.ts` also checks `findDomMatches` on words shown in another scheme: a match by the stored form highlights the whole shown word, a query in the shown script finds the same words once each, and a phrase runs across shown words.
