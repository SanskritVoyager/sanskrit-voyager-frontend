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
