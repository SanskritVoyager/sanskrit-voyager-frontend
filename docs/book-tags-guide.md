# Book Tags Reference Guide

This document describes all the tags parsed and rendered in Sanskrit Voyager book files. Books are stored as JSON with a tree of `TextElement` nodes, each having a `tag`, optional `attributes`, `text`, `translated_text`, and `children`.

---

## Structural Tags

### `div` - Division
Top-level container for grouping content sections. Nested `div` elements are indented. When a `div` has a `type` attribute like `kanda`, `adhyaya`, `sarga`, or `chapter`, it receives heavier borders and spacing.

### `head` - Heading
Section heading or chapter title. Centered, larger font (1.4em), rendered in LinuxBiolinum. Also used (alongside `ChapterTitle`) to populate the book's table of contents / index.

### `lg` - Line Group
Groups lines of verse (a stanza). If it carries an XML `id` attribute (e.g. `BrP_1.1`), the id is displayed as a label in the left margin on desktop. Contains `l` children.

### `l` - Line
An individual line, typically of verse within an `lg`. Displayed as a block with small bottom margin.

### `p` - Paragraph
Prose paragraph. Block display with 1.7 line-height.

### `seg` - Segment
Inline segment, often marking a metrical foot (pada). Attributes: `type="pada"`, `n="a|b|c|d"`. Highlights on hover.

### `text` - Raw Text
Raw text content nodes (e.g. verse number markers like `//`). These are leaf nodes carrying text but no special rendering.

---

## Book-Specific Custom Tags

### `ChapterTitle` - Chapter Title
Major chapter heading. Centered, 1.4em, with a bottom border and extra margin. Creates an entry in the book's table of contents index.

### `Subchapter` - Subchapter Heading
Subchapter heading. Centered, slightly smaller than `ChapterTitle`, with a decorative top border and a centered `◦` dot ornament above.

### `OpeningTitle` - Opening Title
Introductory/opening title at the start of a text. Centered with letter-spacing.

### `Sutra` - Sutra (Styled Variant)
Sutra text rendered with a left border, italic, and indentation. Used as a distinct visual block to set aphorisms apart from commentary.

### `sutra` / `sutra` - Sutra (Type Variant)
When `sutra` appears as a `type` attribute or tag, it renders at 1.2rem in LinuxBiolinum with medium weight. Used for sutra text in certain book formats.

### `Commentary` - Commentary Section
Commentary text. Minimal special styling; serves as a semantic container.

### `LeadingBhashya` - Leading Commentary
Commentary/explanation (Bhashya) text. Italic in Garamond font.

### `IntroBhashya` - Introductory Commentary
Introductory commentary. Italic Garamond, indented 1.5rem with double line-height.

### `Vyakhya` - Explanation
Explanation/interpretation section. Displayed in a slightly muted color.

---

## Formatting / Inline Style Tags

### `hi` - Highlighted / Styled Text
General-purpose inline formatting. The actual style is determined by the `rend` attribute:
- `rend="bold"` - Bold weight
- `rend="it"` or `rend="italic"` - Italic
- `rend="underline"` - Underlined
- `rend="superscript"` / `rend="sup"` - Superscript
- `rend="subscript"` / `rend="sub"` - Subscript

### `emph` - Emphasis
Italic text, for general emphasis.

### `foreign` - Foreign Language Text
Italic text in an accent color, slightly larger (1.25rem). Used for words from a different language than the surrounding text.

### `title` - Title of a Work
Italic. Marks the title of a referenced work.

### `term` - Technical Term
Italic with a dotted underline. Marks specialized/technical vocabulary.

### `persName` - Person Name
Medium font weight (500). Marks a person's name.

### `placeName` - Place Name
Displayed in a lime/green accent color. Marks geographic names.

### `mentioned` - Mentioned Item
Italic in blue. Marks a term being discussed or mentioned rather than used.

---

## Editorial / Critical Apparatus Tags

### `note` - Footnote / Endnote
Rendered as an expandable accordion. Each note gets a sequential number displayed as a small blue superscript in the left margin. Clicking the number expands/collapses the note content.

### `app` - Critical Apparatus
Inline container for textual variants. Contains `lem` and `rdg` children.

### `lem` - Lemma
The base/accepted text in a critical apparatus entry. Shown with a dashed underline and pointer cursor.

### `rdg` - Reading
An alternative textual variant (reading) within an `app`.

### `choice` - Choice Container
Groups alternative forms. Contains pairs like `sic`/`corr` or `orig`/`reg`.

### `corr` - Correction
The corrected form in a `choice` pair. Shown with a dashed underline.

### `sic` - Error in Source
Text as it erroneously appears in the source. Displayed with a red wavy strikethrough.

### `reg` - Regularized Form
The regularized/standardized form in a `choice` pair. Shown with a dashed underline.

### `orig` - Original Form
The original (non-regularized) form in a `choice` pair.

### `supplied` - Supplied Text
Text supplied by an editor (e.g. from a damaged manuscript). Displayed in muted gray. If the reason is "illegible" or "lost", it is wrapped in angle brackets `< >`.

### `del` - Deleted Text
Text that has been deleted/struck. Displayed with red strikethrough.

### `add` - Added Text
Text added by a scribe or editor.

### `gap` - Gap in Text
Indicates missing or illegible text. Rendered as `[......]` in gray italic.

### `unclear` - Unclear Text
Text that is difficult to read. Shown with a gray background highlight and help cursor.

### `subst` - Substitution
Container grouping a deletion and its replacement addition.

### `surplus` - Surplus Text
Extra text present in the source that the editor considers not part of the original.

---

## Quotation and Reference Tags

### `q` - Inline Quotation
Wrapped in smart curly quotes (`"..."`) automatically via CSS. Displayed in italic.

### `quote` - Block Quotation
Block-level quotation. Indented with a left border, italic, in LinuxBiolinum font.

### `ref` - Reference
A cross-reference to another passage or work.

### `cit` - Citation
A citation container, typically wrapping a `quote` and a `bibl`.

### `bibl` - Bibliography Entry
A bibliographic reference.

### `citedRange` - Cited Range
Specifies the range being cited within a `bibl`.

---

## Page Layout and Milestone Tags

### `pb` - Page Break
Displays as a centered, dashed-border line: `--- Page N (edition) ---`. Attributes:
- `n` - Page number
- `ed` - Edition identifier

### `milestone` - Milestone Marker
Similar to `pb` but for arbitrary divisions. Displays as: `--- Unit N ---`. Attributes:
- `unit` - The type of milestone (e.g. "verse", "section")
- `n` - The milestone number/value

### `lb` - Line Break
A line break marker. Primarily metadata; does not render visually.

### `caesura` - Metrical Caesura
Marks a pause/break within a line of verse.

### `label` - Label
Displayed in the left margin on desktop (positioned absolutely). Contains verse numbers, section markers, etc. Shown in LinuxBiolinum at 0.9rem.

### `trailer` - Trailing Colophon
Closing statement at the end of a section. Centered, italic, smaller (0.9em), with a bottom border.

---

## Decorative / Terminal Tags

### `homage` - Homage / Invocation
Centered italic text in muted color. Used for invocations or salutations (e.g. "namo buddhaya"). Translation shown below in normal style.

### `colophon` - Colophon
Decorative end-of-text block. Centered with double borders, gradient background, and Sanskrit double-danda ornaments (`॥`). A decorative line appears below.

---

## Table and List Tags

### `table` - Table
### `row` - Table Row
### `cell` - Table Cell
### `list` - List
### `item` - List Item
### `ab` - Arbitrary Block

Standard structural containers for tabular and list content.

---

## Dramatic / Speaker Tags

### `sp` - Speech
A speech act in dramatic texts. Contains `speaker` and text.

### `speaker` - Speaker Name
Identifies who is speaking in a dramatic text.

### `stage` - Stage Direction
A stage direction in dramatic texts.

---

## Other Tags

### `anchor` - Anchor Point
A reference target point in the text.

### `span` - Generic Span
Generic inline container.

### `name` - Name
A generic name element.

### `w` - Word
A single word, potentially carrying linguistic annotations.

### `s` - Sentence
A sentence-level container.

### `link` - Hyperlink
### `ptr` - Pointer
Reference/link elements.

### `witDetail` - Witness Detail
Manuscript witness information in the critical apparatus.

### `locus` - Locus
A location reference within a manuscript.

### `rs` - Referencing String
A generic referencing element.

### `gi` - Generic Identifier
### `epigraph` - Epigraph
A motto or quotation at the beginning of a section.

---

## Key Attributes

| Attribute | Used On | Purpose |
|-----------|---------|---------|
| `rend` | `hi`, others | Rendering style: `bold`, `it`, `italic`, `underline`, `superscript`, `subscript`, etc. |
| `type` | `div`, `seg`, others | Semantic type: `chapter`, `adhyaya`, `sarga`, `kanda`, `pada`, `commentary`, `base-text`, etc. |
| `n` | `pb`, `milestone`, `seg` | Number/identifier (page number, pada letter a/b/c/d, etc.) |
| `ed` | `pb` | Edition identifier for page breaks |
| `unit` | `milestone` | Milestone type (e.g. "verse") |
| `xml:id` / `id` | `lg`, others | Unique element identifier, displayed as a label for `lg` elements |

---

## Inline Markup in Text Content

Beyond the XML-like tag structure, the `text` and `translated_text` string fields contain inline markup:

### In Original Sanskrit Text (`text` field)

| Pattern | Meaning |
|---------|---------|
| `\|` (single pipe) | Verse line separator (danda) - used to split text into visual lines |
| `\|\|` (double pipe) | Major section break (double danda) - separators-only lines are hidden |
| `//` | Alternative section separator - hidden when it's the entire line |
| `word_1` or `word_1.5` | Word position markers - stripped during rendering |
| `*` | Stripped during rendering |
| `/` | Converted to `\|` (pipe) for display |
| `.` (not before digit) | Converted to `\|` (pipe) for display |

### In Translated Text (`translated_text` field)

| Pattern | Meaning |
|---------|---------|
| `<s>word</s>` | Marks a Sanskrit word within English translation. Rendered as an italicized, clickable span that triggers dictionary lookup. Example: `"Then <s>Asvalaya</s> approached"` |

### Separator-Only Lines (Skipped)
Lines consisting entirely of `||`, `//`, `*||*`, or `*//*` are not rendered.
