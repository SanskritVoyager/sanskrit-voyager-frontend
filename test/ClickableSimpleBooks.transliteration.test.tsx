import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../src/theme';
import ClickableSimpleBooks from '../src/components/ClickableBooks/ClickableSimpleBooks';
import { TransliterationProvider } from '../src/context/TransliterationContext';
import { loadTransliterator } from '../src/utils/transliterator';
import { BookText, TextElement } from '../src/types/bookTypes';
import type { TransliterationScheme } from '../src/utils/transliterationSchemes';

vi.mock('../src/components/WordInfoPortal', () => ({ default: () => null }));

// jsdom cannot fetch the module, so the provider gets the build from disk. The
// factory must not import anything that imports this module, or it waits on itself.
vi.mock('../src/utils/transliterator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/transliterator')>();
  const { readTransliteratorWasm } = await import('../test-utils/transliteratorWasm');
  const loaded = actual.instantiateTransliterator(readTransliteratorWasm());
  return { ...actual, loadTransliterator: () => loaded };
});

// jsdom has no CSS Custom Highlight API; this stands in for CSS.highlights and Highlight
class FakeHighlight extends Set<AbstractRange> {
  priority = 0;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const passage = (segmentNumber: number, text: string, translation?: string): TextElement => ({
  tag: 'p',
  attributes: {},
  text,
  translated_text: translation,
  segment_number: segmentNumber,
});

const book: BookText = {
  body: [
    { tag: 'head', attributes: {}, text: 'Chapter 1' },
    // Plain ASCII: a heading converts only with diacritics or Devanagari
    { tag: 'head', attributes: {}, text: 'Synopsis' },
    { tag: 'head', attributes: {}, text: "prathamo 'dhyāyaḥ" },
    passage(1, 'atha yogānuśāsanam |', 'Now the teaching of <s>yoga</s>.'),
    {
      ...passage(2, 'yogaś cittavṛttinirodhaḥ |'),
      children: [{ tag: 'note', attributes: {}, text: 'cittavṛtti° om. B' }],
    },
    passage(3, 'Not found in all editions.'),
    {
      tag: 'div',
      attributes: { id: 'section-2', display_heading: 'dvitīyaḥ paricchedaḥ' },
      children: [passage(4, 'tadā draṣṭuḥ svarūpe avasthānam || 1.3 ||')],
    },
  ],
};

const props = {
  bookText: book,
  textType: 'both',
  wordData: [],
  isLoadingWordData: false,
  targetSegmentNumber: null,
  setTargetSegmentNumber: vi.fn(),
  query: '',
  matchedBookSegments: [],
  setMatchedBookSegments: vi.fn(),
  setSelectedWord: vi.fn(),
  setClickedAdditionalWord: vi.fn(),
  searchMatchedSegments: [],
  setSearchMatchedSegments: vi.fn(),
};

type Props = React.ComponentProps<typeof ClickableSimpleBooks>;

const reader = (scheme: TransliterationScheme, extra: Partial<Props> = {}) => (
  <MantineProvider theme={theme}>
    <TransliterationProvider scheme={scheme}>
      <ClickableSimpleBooks {...props} {...extra} />
    </TransliterationProvider>
  </MantineProvider>
);

/** The reader in `scheme`, once the transliterator has arrived */
const renderReader = async (scheme: TransliterationScheme, extra: Partial<Props> = {}) => {
  const view = render(reader(scheme, extra));
  // The provider waits on the same promise, and set its state before this resumes
  await act(async () => {
    await loadTransliterator();
  });
  return view;
};

const textOf = (container: HTMLElement) => container.textContent ?? '';

describe('book text in the picked scheme', () => {
  it('shows the words converted and looks up the stored word on a click', async () => {
    const setSelectedWord = vi.fn();
    await renderReader('DEVANAGARI', { setSelectedWord });

    fireEvent.click(screen.getByText('योगानुशासनम्'));
    expect(setSelectedWord).toHaveBeenCalledWith('yogānuśāsanam');
    fireEvent.click(screen.getByText('योगश्'));
    expect(setSelectedWord).toHaveBeenLastCalledWith('yogaś');
  });

  it("converts a translation's Sanskrit terms and leaves its English alone", async () => {
    const setSelectedWord = vi.fn();
    const { container } = await renderReader('DEVANAGARI', { setSelectedWord });

    expect(textOf(container)).toContain('Now the teaching of');
    fireEvent.click(screen.getByText('योग'));
    expect(setSelectedWord).toHaveBeenCalledWith('yoga');
  });

  it('keeps English lines, English headings, notes and verse numbers as stored', async () => {
    const { container } = await renderReader('DEVANAGARI');
    const text = textOf(container);

    // The reader shows its period as a danda, as for every original text
    expect(text).toContain('Not found in all editions');
    expect(text).toContain('Chapter 1');
    // In the text and in the table of contents
    expect(screen.getAllByText('Synopsis')).toHaveLength(2);
    // Notes mix readings with sigla and editors' abbreviations (om. = omitted, not ओम्)
    expect(text).toContain('cittavṛtti° om');
    expect(text).toContain('1.3');
  });

  it('converts Sanskrit headings and their table of contents entries', async () => {
    await renderReader('DEVANAGARI');

    expect(screen.getByRole('heading', { name: 'द्वितीयः परिच्छेदः' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'प्रथमो ऽध्यायः' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'द्वितीयः परिच्छेदः' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chapter 1' })).toBeInTheDocument();
  });

  it('converts each distinct word once per scheme', async () => {
    const transliterator = await loadTransliterator();
    const calls = vi.spyOn(transliterator, 'transliterate');
    const repeated: BookText = {
      body: [passage(1, 'iti iti iti'), passage(2, 'iti ca iti')],
    };
    const { rerender } = await renderReader('HK', { bookText: repeated });
    expect(calls.mock.calls.map(([text]) => text).sort()).toEqual(['ca', 'iti']);

    calls.mockClear();
    rerender(reader('DEVANAGARI', { bookText: repeated }));
    expect(calls.mock.calls.map(([text]) => text).sort()).toEqual(['ca', 'iti']);
    calls.mockRestore();
  });

  it('shows the stored text again when IAST is picked', async () => {
    const { container, rerender } = await renderReader('DEVANAGARI');
    expect(textOf(container)).not.toContain('yogānuśāsanam');

    rerender(reader('IAST'));
    expect(textOf(container)).toContain('atha yogānuśāsanam');
    expect(container.querySelector('[data-stored-text]')).toBeNull();
  });

  it('finds converted words in the in-page search by their stored or shown form', async () => {
    const highlights = new Map<string, FakeHighlight>();
    vi.stubGlobal('CSS', { highlights });
    vi.stubGlobal('Highlight', FakeHighlight);
    const { rerender } = await renderReader('DEVANAGARI', { textType: 'or' });

    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    rerender(reader('DEVANAGARI', { textType: 'or', inPageSearchTrigger: true }));
    // The search box slides in through Mantine's Transition, then debounces input for 300ms
    act(() => {
      vi.advanceTimersByTime(250);
    });
    const search = (query: string) => {
      fireEvent.change(screen.getByPlaceholderText('Search in text...'), {
        target: { value: query },
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
    };
    const marked = () =>
      [...highlights.get('search-highlight-current')!, ...highlights.get('search-highlight')!]
        .map((range) => {
          const live = document.createRange();
          live.setStart(range.startContainer, range.startOffset);
          live.setEnd(range.endContainer, range.endOffset);
          return live.toString();
        })
        .sort();

    search('yoga');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(marked()).toEqual(['योगश्', 'योगानुशासनम्']);

    search('योग');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(marked()).toEqual(['योगश्', 'योगानुशासनम्']);
  });
});
