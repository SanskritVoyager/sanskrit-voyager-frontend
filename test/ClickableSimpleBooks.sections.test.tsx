import React from 'react';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '../test-utils/render';
import ClickableSimpleBooks from '../src/components/ClickableBooks/ClickableSimpleBooks';
import classes from '../src/components/ClickableBooks/ClickableSimpleBooks.module.css';
import { BookText, TextElement } from '../src/types/bookTypes';

// Dictionary lookup is unrelated to book boundaries and needs a separate responsive provider.
vi.mock('../src/components/WordInfoPortal', () => ({ default: () => null }));

afterEach(cleanup);

class BoundaryFixture {
  static passage(segmentNumber: number, tag = 'p'): TextElement {
    return {
      tag,
      attributes: {},
      text: `saṃskṛta ${segmentNumber} ।`,
      translated_text: `English passage ${segmentNumber}.`,
      segment_number: segmentNumber,
    };
  }

  static section(number: number, label = `Section ${number}`): TextElement {
    return {
      tag: 'div',
      attributes: {
        n: String(number),
        type: 'section',
        id: `dasabalasutra-section-${number}`,
        display_heading: label,
      },
      children: Array.from({ length: 25 }, (_, index) =>
        this.passage((number - 1) * 25 + index + 1)
      ),
    };
  }

  static book(): BookText {
    return { body: [1, 2, 3, 4].map((number) => this.section(number)) };
  }

  static props(bookText: BookText, textType = 'both') {
    return {
      bookText,
      textType,
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
  }
}

describe('repaired book section boundaries', () => {
  it('renders four headings and navigates from each TOC entry to its stable anchor', () => {
    render(<ClickableSimpleBooks {...BoundaryFixture.props(BoundaryFixture.book())} />);

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings).toHaveLength(4);
    headings.forEach((heading, index) => {
      expect(heading).toHaveTextContent(`Section ${index + 1}`);
      expect(heading).toHaveAttribute('id', `dasabalasutra-section-${index + 1}`);
      const scroll = vi.spyOn(heading, 'scrollIntoView');
      fireEvent.click(screen.getByRole('button', { name: `Section ${index + 1}` }));
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      scroll.mockRestore();
    });
  });

  it('keeps distinct anchors when sections have repeated display labels', () => {
    const book: BookText = {
      body: [BoundaryFixture.section(1, 'Section'), BoundaryFixture.section(2, 'Section')],
    };
    render(<ClickableSimpleBooks {...BoundaryFixture.props(book)} />);

    const headings = screen.getAllByRole('heading', { name: 'Section' });
    const buttons = screen.getAllByRole('button', { name: 'Section' });
    headings.forEach((heading, index) => {
      expect(heading.id).toBe(`dasabalasutra-section-${index + 1}`);
      const scroll = vi.spyOn(heading, 'scrollIntoView');
      fireEvent.click(buttons[index]);
      expect(scroll).toHaveBeenCalledOnce();
      scroll.mockRestore();
    });
  });

  it('renders existing Sanskrit and English opening/closing prose as styled blocks', () => {
    const opener: TextElement = {
      ...BoundaryFixture.passage(1, 'opener'),
      text: 'śrāvastyāṃ nidānam ।',
      translated_text: 'The setting is Śrāvastī.',
    };
    const colophon: TextElement = {
      ...BoundaryFixture.passage(2, 'colophon'),
      text: 'daśabalasūtraṃ samāptam ॥',
      translated_text: 'The Daśabalasūtra is complete.',
    };
    const { container } = render(
      <ClickableSimpleBooks {...BoundaryFixture.props({ body: [opener, colophon] })} />
    );

    for (const element of [opener, colophon]) {
      const block = container.querySelector(`[data-segment-number="${element.segment_number}"]`)!;
      expect(block).toHaveClass(classes[element.tag]);
      const original = block.querySelector(`.${classes.originalText}`)!;
      expect(original.tagName).toBe('DIV');
      expect(original).toHaveTextContent(element.text!);
      expect(within(block as HTMLElement).getByText(element.translated_text!)).toBeInTheDocument();
    }
  });

  it('leaves all 100 source pairs and segment numbers intact while adding headings', () => {
    const book = BoundaryFixture.book();
    const before = JSON.stringify(book);
    const { container } = render(<ClickableSimpleBooks {...BoundaryFixture.props(book)} />);

    expect(JSON.stringify(book)).toBe(before);
    const segments = Array.from(container.querySelectorAll('[data-segment-number]'));
    expect(segments).toHaveLength(100);
    segments.forEach((segment, index) => {
      expect(segment).toHaveAttribute('data-segment-number', String(index + 1));
      expect(segment.querySelector(`.${classes.originalText}`)).toHaveTextContent(
        `saṃskṛta ${index + 1} ।`
      );
      expect(segment.querySelector(`.${classes.translatedText}`)).toHaveTextContent(
        `English passage ${index + 1}.`
      );
    });
    screen.getAllByRole('heading', { level: 2 }).forEach((heading) => {
      expect(heading).not.toHaveAttribute('data-segment-number');
    });
  });

  it('shows nested section headings in translation-only mode without source text nodes', () => {
    const book: BookText = {
      body: [{ tag: 'div', attributes: {}, children: [BoundaryFixture.section(2)] }],
    };
    const { container } = render(<ClickableSimpleBooks {...BoundaryFixture.props(book, 'tran')} />);

    expect(screen.getByRole('heading', { name: 'Section 2' })).toHaveAttribute(
      'id',
      'dasabalasutra-section-2'
    );
    expect(screen.getByRole('button', { name: 'Section 2' })).toBeInTheDocument();
    expect(container.querySelectorAll(`.${classes.originalText}`)).toHaveLength(0);
    expect(container.querySelectorAll(`.${classes.translatedText}`)).toHaveLength(25);
  });

  it('preserves legacy head and ChapterTitle TOC entries alongside metadata headings', () => {
    const book: BookText = {
      body: [
        { tag: 'head', attributes: {}, text: 'Legacy head' },
        BoundaryFixture.section(1),
        { tag: 'ChapterTitle', attributes: {}, text: 'Legacy chapter' },
      ],
    };
    render(<ClickableSimpleBooks {...BoundaryFixture.props(book)} />);

    for (const [name, id] of [
      ['Legacy head', 'chapter-0'],
      ['Legacy chapter', 'chapter-2'],
    ]) {
      const anchor = document.getElementById(id)!;
      expect(anchor).toHaveTextContent(name);
      const scroll = vi.spyOn(anchor, 'scrollIntoView');
      fireEvent.click(screen.getByRole('button', { name }));
      expect(scroll).toHaveBeenCalledOnce();
      scroll.mockRestore();
    }
  });

  it('does not synthesize headings from incomplete metadata or non-division tags', () => {
    const book: BookText = {
      body: [
        { tag: 'div', attributes: { display_heading: 'No anchor' } },
        { tag: 'div', attributes: { id: 'no-label' } },
        { tag: 'div', attributes: { id: 'invalid anchor', display_heading: 'Invalid anchor' } },
        {
          tag: 'p',
          attributes: { id: 'paragraph', display_heading: 'Not a section' },
          text: 'atha',
        },
      ],
    };
    render(<ClickableSimpleBooks {...BoundaryFixture.props(book)} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByText('Table of Contents')).not.toBeInTheDocument();
  });
});

const repairedBookPath = process.env.REPAIRED_BOOK_TEST_PATH;

it.skipIf(!repairedBookPath)(
  'renders the supplied repaired book with 100 pairs and four boundaries',
  () => {
    const book = JSON.parse(readFileSync(repairedBookPath!, 'utf8')) as BookText;
    const before = JSON.stringify(book);
    const { container } = render(<ClickableSimpleBooks {...BoundaryFixture.props(book)} />);

    expect(JSON.stringify(book)).toBe(before);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
    for (let number = 1; number <= 4; number++) {
      expect(screen.getByRole('heading', { name: `Section ${number}` })).toHaveAttribute(
        'id',
        `dasabalasutra-section-${number}`
      );
      expect(screen.getByRole('button', { name: `Section ${number}` })).toBeInTheDocument();
    }
    expect(container.querySelectorAll(`.${classes.opener}`)).toHaveLength(3);
    expect(container.querySelectorAll(`.${classes.colophon}`)).toHaveLength(3);
    const segments = Array.from(container.querySelectorAll('[data-segment-number]'));
    expect(segments).toHaveLength(100);
    expect(
      new Set(segments.map((segment) => segment.getAttribute('data-segment-number'))).size
    ).toBe(100);
    segments.forEach((segment) => {
      expect(segment.querySelector(`.${classes.originalText}`)).not.toBeEmptyDOMElement();
      expect(segment.querySelector(`.${classes.translatedText}`)).not.toBeEmptyDOMElement();
    });
  }
);
