import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import HighlightText from '../src/utils/HighlightText';

afterEach(cleanup);

const marks = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('mark'), (mark) => mark.textContent);

describe('HighlightText', () => {
  it('marks every word holding a query term and keeps the text intact', () => {
    const { container } = render(<HighlightText text="rāmo dharmaṃ vetti ।" query="dharma vet" />);

    expect(marks(container)).toEqual(['dharmaṃ', 'vetti']);
    expect(container.textContent).toBe('rāmo dharmaṃ vetti ।');
  });

  it('drops the old marks when only the query changes', () => {
    const { container, rerender } = render(
      <HighlightText text="rāmo dharmaṃ vetti" query="dharma" />
    );
    rerender(<HighlightText text="rāmo dharmaṃ vetti" query="vetti" />);

    expect(marks(container)).toEqual(['vetti']);
    expect(container.textContent).toBe('rāmo dharmaṃ vetti');
  });

  it('renders the plain text when there is no query or no match', () => {
    const { container, rerender } = render(<HighlightText text="rāmo dharmaṃ" query="" />);
    expect(marks(container)).toEqual([]);

    rerender(<HighlightText text="rāmo dharmaṃ" query="kṛṣṇa" />);
    expect(marks(container)).toEqual([]);
    expect(container.textContent).toBe('rāmo dharmaṃ');
  });
});
