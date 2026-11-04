import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../src/theme';
import ClickableSimpleBooks from '../src/components/ClickableBooks/ClickableSimpleBooks';
import { BookText, TextElement } from '../src/types/bookTypes';

vi.mock('../src/components/WordInfoPortal', () => ({ default: () => null }));

// Every word span render is recorded, so a test can tell which segments rendered
const { spanRenders } = vi.hoisted(() => ({ spanRenders: [] as string[] }));
vi.mock('../src/components/ClickableBooks/ClickableSimpleBooksSpan', () => ({
  default: ({ wordText, onClick }: { wordText: string; onClick: () => void }) => {
    spanRenders.push(wordText.trim());
    return <span onClick={onClick}>{wordText}</span>;
  },
}));

afterEach(() => {
  cleanup();
  spanRenders.length = 0;
});

const passage = (segmentNumber: number, text: string): TextElement => ({
  tag: 'p',
  attributes: {},
  text,
  segment_number: segmentNumber,
});

const book: BookText = {
  body: [
    passage(1, 'atha yogānuśāsanam'),
    passage(2, 'yogaś cittavṛttinirodhaḥ'),
    passage(3, 'tadā draṣṭuḥ svarūpe avasthānam'),
  ],
};

// The same callback instances throughout, as the home page's state setters are
const baseProps = {
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

// Rendered directly (not through test-utils' fragment wrapper), so a rerender
// updates the mounted component instead of replacing it
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider theme={theme}>{children}</MantineProvider>
);
const book1 = (extra: Partial<Props> = {}) => <ClickableSimpleBooks {...baseProps} {...extra} />;
const renderBook = (extra: Partial<Props> = {}) => render(book1(extra), { wrapper });

const wordsOf = (...segments: number[]) =>
  segments.flatMap((n) => book.body![n - 1].text!.split(' ')).sort();
const rendered = () => [...spanRenders].sort();

describe('ClickableSimpleBooks re-rendering', () => {
  it('renders every word once on mount', () => {
    renderBook();
    expect(rendered()).toEqual(wordsOf(1, 2, 3));
  });

  it('re-renders only the segments a target change concerns', () => {
    const { rerender } = renderBook();
    spanRenders.length = 0;

    rerender(book1({ targetSegmentNumber: 2 }));
    expect(rendered()).toEqual(wordsOf(2));
    spanRenders.length = 0;

    // Moving the target re-renders the old and the new segment
    rerender(book1({ targetSegmentNumber: 3 }));
    expect(rendered()).toEqual(wordsOf(2, 3));
  });

  it('re-renders only the matched segments when the search results change', () => {
    const { rerender } = renderBook();
    spanRenders.length = 0;

    rerender(book1({ matchedBookSegments: [1, 3], query: 'atha' }));
    expect(rendered()).toEqual(wordsOf(1, 3));
  });

  it('does not re-render the text when the dictionary data it passes through changes', () => {
    const { rerender } = renderBook({ targetSegmentNumber: 2 });
    spanRenders.length = 0;

    rerender(book1({ targetSegmentNumber: 2, isLoadingWordData: true }));
    rerender(book1({ targetSegmentNumber: 2, wordData: [{ word: 'yogaḥ' } as never] }));
    expect(spanRenders).toEqual([]);
  });
});
