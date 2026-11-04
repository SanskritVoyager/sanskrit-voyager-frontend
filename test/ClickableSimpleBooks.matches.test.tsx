import React from 'react';
import { cleanup, fireEvent, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '../test-utils/render';
import ClickableSimpleBooks from '../src/components/ClickableBooks/ClickableSimpleBooks';
import classes from '../src/components/ClickableBooks/ClickableSimpleBooks.module.css';
import { BookText, TextElement } from '../src/types/bookTypes';

// Dictionary lookup is unrelated to the text and needs a separate responsive provider.
vi.mock('../src/components/WordInfoPortal', () => ({ default: () => null }));

afterEach(cleanup);

const passage = (segmentNumber: number, text: string, children?: TextElement[]): TextElement => ({
  tag: 'p',
  attributes: {},
  text,
  segment_number: segmentNumber,
  children,
});

const note = (text: string): TextElement => ({ tag: 'note', attributes: {}, text });

const book: BookText = {
  body: [
    passage(1, 'atha yogānuśāsanam ।', [note('first note')]),
    passage(2, 'yogaś cittavṛttinirodhaḥ ।'),
    passage(3, 'tadā draṣṭuḥ svarūpe avasthānam ।', [note('second note')]),
  ],
};

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

const segment = (container: HTMLElement, n: number) =>
  container.querySelector(`[data-segment-number="${n}"]`) as HTMLElement;

const noteNumbers = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(`.${classes.noteNumber}`)).map((el) => el.textContent);

describe('ClickableSimpleBooks search matches', () => {
  it('marks the query inside the words of a matched segment and keeps them clickable', () => {
    const setSelectedWord = vi.fn();
    const { container } = render(
      <ClickableSimpleBooks
        {...baseProps}
        matchedBookSegments={[2]}
        query="cittavrtti"
        setSelectedWord={setSelectedWord}
      />
    );

    const matched = segment(container, 2);
    expect(matched).toHaveClass(classes.matchedSegment);
    // Diacritic-insensitive, and the mark grows to the whole word
    const mark = within(matched).getByText('cittavṛttinirodhaḥ', { selector: 'mark' });
    expect(mark.closest(`.${classes.word}`)).not.toBeNull();

    fireEvent.click(mark);
    expect(setSelectedWord).toHaveBeenCalledWith('cittavṛttinirodhaḥ');

    expect(segment(container, 1).querySelector('mark')).toBeNull();
    expect(segment(container, 3).querySelector('mark')).toBeNull();
  });

  it('marks the query in the target segment too', () => {
    const { container } = render(
      <ClickableSimpleBooks {...baseProps} targetSegmentNumber={3} query="svarupe" />
    );
    const target = segment(container, 3);
    expect(target).toHaveClass(classes.highlightedSegment);
    expect(within(target).getByText('svarūpe', { selector: 'mark' })).toBeInTheDocument();
    expect(segment(container, 2).querySelector('mark')).toBeNull();
  });

  it('numbers footnotes in text order and keeps them when the target moves', () => {
    const { container, rerender } = render(<ClickableSimpleBooks {...baseProps} />);
    expect(noteNumbers(container)).toEqual(['1', '2']);

    rerender(<ClickableSimpleBooks {...baseProps} targetSegmentNumber={2} />);
    expect(segment(container, 2)).toHaveClass(classes.highlightedSegment);
    expect(noteNumbers(container)).toEqual(['1', '2']);
  });
});
