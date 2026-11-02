import React from 'react';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../test-utils/render';
import ClickableSimpleBooks from '../src/components/ClickableBooks/ClickableSimpleBooks';
import { BookText, TextElement } from '../src/types/bookTypes';

// Dictionary lookup is unrelated to search and needs a separate responsive provider.
vi.mock('../src/components/WordInfoPortal', () => ({ default: () => null }));

// jsdom has no CSS Custom Highlight API; this stands in for CSS.highlights and Highlight
class FakeHighlight extends Set<AbstractRange> {
  priority = 0;
}

class SearchFixture {
  static passage(segmentNumber: number, text: string): TextElement {
    return {
      tag: 'p',
      attributes: {},
      text,
      translated_text: `English passage ${segmentNumber}.`,
      segment_number: segmentNumber,
    };
  }

  static book(): BookText {
    return {
      body: [
        this.passage(1, 'rāmo dharmaṃ vetti ।'),
        this.passage(2, 'kṛṣṇa arjunaṃ uvāca ।'),
        this.passage(3, 'dharmakṣetre kurukṣetre ।'),
      ],
    };
  }

  static props() {
    return {
      bookText: this.book(),
      textType: 'or',
      wordData: [],
      isLoadingWordData: false,
      targetSegmentNumber: null as number | null,
      setTargetSegmentNumber: vi.fn(),
      query: '',
      matchedBookSegments: [],
      setMatchedBookSegments: vi.fn(),
      setSelectedWord: vi.fn(),
      setClickedAdditionalWord: vi.fn(),
      searchMatchedSegments: [],
      setSearchMatchedSegments: vi.fn(),
    };
  }
}

const rangeText = (range: AbstractRange) => {
  const live = document.createRange();
  live.setStart(range.startContainer, range.startOffset);
  live.setEnd(range.endContainer, range.endOffset);
  return live.toString();
};

// The hook reports segments through a state updater; apply the last one to an empty list
const reportedSegments = (setter: ReturnType<typeof vi.fn>) => {
  const update = setter.mock.calls[setter.mock.calls.length - 1][0];
  return typeof update === 'function' ? update([]) : update;
};

const openSearch = (props: ReturnType<typeof SearchFixture.props>) => {
  const view = render(<ClickableSimpleBooks {...props} />);
  view.rerender(<ClickableSimpleBooks {...props} inPageSearchTrigger />);
  // The search box slides in through Mantine's Transition (animation frames and 200ms)
  act(() => {
    vi.advanceTimersByTime(250);
  });
  return view;
};

const searchFor = (query: string) => {
  fireEvent.change(screen.getByPlaceholderText('Search in text...'), {
    target: { value: query },
  });
  // The search box debounces input for 300ms
  act(() => {
    vi.advanceTimersByTime(300);
  });
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('in-page search', () => {
  it('paints matches as highlights, moves the current one and clears them on close', () => {
    const highlights = new Map<string, FakeHighlight>();
    vi.stubGlobal('CSS', { highlights });
    vi.stubGlobal('Highlight', FakeHighlight);
    const props = SearchFixture.props();
    openSearch(props);

    searchFor('dharma');
    const all = highlights.get('search-highlight')!;
    const current = highlights.get('search-highlight-current')!;
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect([...current].map(rangeText)).toEqual(['dharmaṃ']);
    expect([...all].map(rangeText)).toEqual(['dharmakṣetre']);
    expect(current.priority).toBe(1);
    expect(reportedSegments(props.setSearchMatchedSegments)).toEqual([1, 3]);

    fireEvent.keyDown(screen.getByPlaceholderText('Search in text...'), { key: 'Enter' });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect([...current].map(rangeText)).toEqual(['dharmakṣetre']);
    expect([...all].map(rangeText)).toEqual(['dharmaṃ']);

    fireEvent.click(screen.getByTitle('Close search (Esc)'));
    expect(highlights.size).toBe(0);
    expect(reportedSegments(props.setSearchMatchedSegments)).toEqual([]);
  });

  it('matches a phrase across word spans', () => {
    vi.stubGlobal('CSS', { highlights: new Map() });
    vi.stubGlobal('Highlight', FakeHighlight);
    openSearch(SearchFixture.props());

    searchFor('rāmo dharmam');
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });

  it('searches again after the text changes, keeping the current match without scrolling', () => {
    const highlights = new Map<string, FakeHighlight>();
    vi.stubGlobal('CSS', { highlights });
    vi.stubGlobal('Highlight', FakeHighlight);
    const props = SearchFixture.props();
    const { rerender } = openSearch(props);
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');

    searchFor('dharma');
    expect(scroll).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByPlaceholderText('Search in text...'), { key: 'Enter' });
    scroll.mockClear();

    // A target segment is redrawn through HighlightText, replacing its text nodes
    rerender(<ClickableSimpleBooks {...props} targetSegmentNumber={3} inPageSearchTrigger />);
    const [currentRange] = highlights.get('search-highlight-current')!;
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(currentRange.startContainer.isConnected).toBe(true);
    expect(rangeText(currentRange)).toBe('dharmakṣetre');
    expect(scroll).not.toHaveBeenCalled();
    scroll.mockRestore();
  });

  it('still counts and reports matches without the Highlight API', () => {
    const props = SearchFixture.props();
    openSearch(props);

    searchFor('krsna');
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(reportedSegments(props.setSearchMatchedSegments)).toEqual([2]);
  });

  it('never matches the search box itself', () => {
    openSearch(SearchFixture.props());

    searchFor('1');
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });
});
