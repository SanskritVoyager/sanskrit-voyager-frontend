# Transliteration display: handoff

State on 2026-11-06. The navbar's scheme selector ("Select Transliteration Scheme")
converts the reader's book text, its headings and table of contents, the analysis
box, and the dictionary panel, including the headwords that start each entry. The
choice survives a reload. What is still left is listed under "Left open".

## What works

| Piece | Where |
|---|---|
| Engine: vidyut-lipi compiled to WebAssembly, patched for per-call speed | `wasm/transliteration/` (README there); the app loads the committed `pkg/` build, rebuilt with `npm run build:wasm` |
| Loader: fetched on the first switch away from IAST, once | `src/utils/transliterator.ts` (`loadTransliterator`, `instantiateTransliterator`) |
| Display rules: words, tokens of running text, English lines, headings | `src/utils/displayWord.ts` |
| Source scheme of a stored word (IAST, Devanagari, or uncertain) | `src/utils/transliterationSchemes.ts` (`schemeOfSourceWord`) |
| Display scheme for the whole page, cached per word and scheme | `src/context/TransliterationContext.tsx`: `TransliterationProvider` wraps the page in `Home.page.tsx`; components call `useDisplayWord()` |
| Book text | `BookSpan` (`ClickableSimpleBooksSpan.tsx`) reads the scheme itself; `BookSegment` in `ClickableSimpleBooks.tsx` only decides whether its words may convert |
| Section headings and the table of contents | `ShownText` (`src/components/ClickableBooks/ShownText.tsx`), used by `BookSegment` and `BookIndex` |
| In-page search finds converted words | `findDomMatches` in `src/utils/searchMatcher.ts` also matches the stored form in `data-stored-text` |
| Dictionary panel | `DictionaryEntry` (`<s>`, `<s1>`, the `<b>` headword of Grassmann and Edgerton entries), `WordDataComponent` (headwords, components, "from:" stem), `InflectionTable`, `WordInfo` (the popup beside a clicked word) |
| Devanagari fonts named, so the browser skips a font search per word | `src/fonts/SanskritDevanagari.css`, first in the theme's font stack (`src/theme.ts`) |
| Lookups say which scheme their word is in | `input_scheme` on `/process` and `/process_new`; `SelectedWord` in `src/hooks/useSelectedWord.ts`; `?w=…&input_scheme=…` in `src/utils/lookupParams.ts` |
| The picked scheme survives a reload | `src/hooks/useTransliterationScheme.ts`: localStorage key `transliteration-scheme` |

Display is display only. Every click looks up the **stored** word, with the scheme
`schemeOfSourceWord` gives it. Tamil and Bengali lose letters (Tamil writes
k/kh/g/gh alike, Bengali b/v alike), so a converted word cannot be sent instead.

## How book text converts

The rules were tuned on the corpus: 300 random books, about 1.4 million text elements.

- **Which text:** running original text converts unless the line reads as English
  (`looksLikeEnglish`). Lines from verse and prose are flagged at 0.07% and 0.3%,
  mostly real English (`END OF COMMENTARY`, `<story of Sudarśana>`).
- **Headings** (`head`, `ChapterTitle`, `Subchapter`, `OpeningTitle`,
  `display_heading`, and their table-of-contents entries) convert only when they
  have IAST diacritics or Devanagari and do not read as English (`isSanskritHeading`).
  More than half of the corpus's headings are English: "Chapter 223", "Section 1",
  "7.1.7. Marriage".
- **Notes never convert.** They mix readings with sigla and editors' abbreviations,
  and `om.` (omitted) would become ओम्.
- **Translations:** only the `<s>` words convert.
- **Within a token** (`displayToken`), only letter runs convert. These stay as stored:
  - numbers and references (`1.1`, `HV_79.17a`), because vidyut turns `.` into a danda;
  - lone capitals and Roman numerals (`I.`), because vidyut reads a capital as a vowel;
  - sigla with a capital after the first letter (`MSV,Wi`);
  - runs with letters IAST never uses, such as the `x` of a lacuna or `clxxxviii`.
- **The English test** (`looksLikeEnglish`): a line is English when at least one word
  in five is a common English word, or is spelled as IAST never is. That means f, q, w,
  x or z, two vowels in a row other than ai and au, or an ending such as -ct, -nt, -ng.
  - Some words are left off the English list because they are also Sanskrit: `'to`,
    `in` (id before a nasal), `so`, `are`, `a-`, `an-`, `it`.
  - Sanskrit lines that are kept as stored: hiatus spellings (`adhoakṣajam`) and Prakrit
    verses. Both are safe, since they stay readable in IAST.
- **Dictionary entry titles:**
  - MW, Apte, Cappeller and Macdonell put the headword in `<s>`.
  - Grassmann and Edgerton put it in a `<b>` at the start of the entry; only that `<b>`
    converts. Other `<b>`, such as sense numbers, stays as stored.
  - Macdonell writes a headword twice, in Devanagari and in his own romanization
    (`कृष्ण krish-ná`). The romanization is not IAST, so it is shown as printed.

## In-page search

Every converted word carries its stored form in `data-stored-text`. `findDomMatches`
searches the text as shown, and a second time with each converted word replaced by its
stored form. It merges the two, so each place is found once.

- **What matches:** an IAST or plain query (`krsna`) finds कृष्ण, and so does a query
  typed in the shown script.
- **Highlighting:** a match in a converted word highlights the whole word, because the
  letters do not line up between the two forms.
- **Prefixes:** a Devanagari query also finds words it is a prefix of. `योग` matches
  योगिन् as `yog` would.

## Measured

These were run in headless Chrome against the dev server; the scripts were in the
session's scratchpad.

- **Yogasūtra:** switches in about 0.2 s, including the first module fetch.
- **Ṛgveda (DCS, 175,000 words):**
  - **Layout:** Devanagari took 21.3 s to lay out, because Chrome searched for a font
    for every word. Naming the platform's own Devanagari fonts in
    `SanskritDevanagari.css` cut that to 1.4 s.
  - **Looks:** each face lists first the font Chrome fell back to before: ITF
    Devanagari beside Palatino, Kohinoor Devanagari beside the sans fonts. Devanagari
    therefore looks the same, on macOS at least.
  - **React redraw:** a switch still redraws every word span. That took about 5 s in
    the one run without heavy swapping. Opening the book takes 10 to 13 s.
- **This machine:** it has 8 GB of RAM and had 13 GB of swap in use. A 2 GB tab
  swaps, so the same switch took anywhere from 5 s to over 2 minutes, and opening the
  Ṛgveda took up to 114 s. Do not time huge books here, and do not read a single run
  as typical.

## Left open

1. **The redraw on the largest books.** Two options:
   - Convert in the DOM without a React redraw. A test rewrite of every Ṛgveda word took
     2 s plus layout, and it would also save the fiber allocation behind the
     garbage-collection pauses.
   - Virtualize or `content-visibility` the reader. Neither has been tried in the app:
     one experiment with `content-visibility` did not finish before its timeout.
     `ScrollMarkers` measures segment positions, which skipped content would distort.
2. **The corpus search panel** (`AdvancedSearch*`, `SemanticResults`) shows passages
   through `HighlightText` in IAST. Another session is building that panel.
3. **Book metadata** (title, author) stays as catalogued.
4. **Shared links** open in the recipient's own saved scheme. There is no URL parameter
   for the scheme.

## Pitfalls met on the way

- **Stable callbacks.** `ClickableSimpleBooks` is memoized and `HeaderSearch` calls
  `onSearch` from an effect that lists it as a dependency. Pass stable callbacks
  (`useCallback`), never inline arrows.
- **`transliterateText('')` returns `undefined`.** `handleTransliteration` in
  `Home.page.tsx` returns early for an empty analysis box, or the open book disappears.
- **Character classes.** Do not put literal combining characters in a regex character
  class (ESLint `no-misleading-character-class`). Use `\p{…}` classes, or build the class
  with `String.fromCharCode`, as `displayWord.ts` does.
- **Mocking the transliterator in tests.** jsdom cannot fetch the module. Tests read the
  build from disk: `test-utils/transliterator.ts` for direct use, and
  `test-utils/transliteratorWasm.ts` inside a `vi.mock` factory. That second file imports
  nothing from `src`; a factory that imports the module it replaces deadlocks the run.
- **`local()` fonts** match a font's PostScript or full name, never its family name
  (`ITFDevanagari-Book`, not `ITF Devanagari`). Check what Chrome draws with
  `CSS.getPlatformFontsForNode` over the DevTools protocol.
- **`data-word`** belongs to the dictionary headings: `WordDataComponent` scrolls to
  `[data-word=…]` anywhere in the document. Book spans use `data-stored-text`.
- **ESLint and `test/`.** ESLint cannot parse files under `test/`, because
  `tsconfig.json` includes only `src` and `test-utils`. Several reader and dictionary
  files carry older lint errors (a11y on clickable spans, `no-plusplus`); they predate
  this work.
