# Book rendering and repair metadata

`ClickableSimpleBooks.tsx` renders hierarchical `BookText` data, aligned original/translated text, notes, labels, dictionary interactions and segment navigation. `ClickableSimpleBooks.module.css` maps source tags and lowercased `attributes.type` values to presentation classes. `BookIndex.tsx` renders the table of contents. `BookSectionHeading` supplies the shared section heading/anchor contract used by both the content renderer and TOC extraction.

## Section boundaries without changing alignment

A repair may add `display_heading` and a unique, stable `id` to an existing `div`:

```json
{
  "tag": "div",
  "attributes": {
    "n": "1",
    "type": "section",
    "id": "dasabalasutra-section-1",
    "display_heading": "Section 1"
  },
  "children": []
}
```

The reader renders an `h2` and matching TOC entry from these attributes. It adds no source text node, translated text, or segment number. Display headings remain visible in original-only and translation-only modes. Repeated labels are supported because navigation uses the unique `id`, not the label. IDs must be nonempty and contain no whitespace. Existing text-bearing `head` and `ChapterTitle` behavior remains supported.

`.head` provides existing heading typography; `.sectionHeading` sets generated-heading weight and scroll offset. `.div.section` retains the section spacing. `opener` marks an existing opening prose passage and aliases `.OpeningTitle` styling; it is rendered as block content without changing its Sanskrit, English, or segment number. Existing `colophon` styling provides the ending treatment. Repair code should retag the existing passage and preserve its pair instead of inserting replacement text or an invented closing passage.

## Other modules

`ClickableSimpleBooksSpan.tsx` renders clickable words; `textUtils.ts` handles text splitting and danda/reference display. `ClickableSimpleMarkers.tsx` renders segment scroll markers. The `virtualised_test/` text files are archived rendering experiments.

## Repair review checklist

A repair report should list added/changed tags and metadata fields, the matching TSX behavior and CSS selectors, any renderer changes needed, and checks that source/translation keys, pairs, and segment numbers remain unchanged. Unknown attributes alone do not guarantee visible output. This boundary support does not add inline restoration-offset rendering or change the editorial-note and nested reference-label presentation; assess those separately before asserting parity with an HTML repair preview.

Tests are documented in `test/readme.md`.
