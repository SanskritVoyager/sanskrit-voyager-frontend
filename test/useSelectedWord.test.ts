import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NO_SELECTED_WORD, useSelectedWord } from '../src/hooks/useSelectedWord';

const setup = () => {
  const { result } = renderHook(() => useSelectedWord());
  const select = (word: string, scheme?: Parameters<(typeof result.current)[1]>[1]) =>
    act(() => result.current[1](word, scheme));
  return { current: () => result.current[0], select };
};

describe('useSelectedWord', () => {
  it('starts with no word', () => {
    expect(setup().current()).toBe(NO_SELECTED_WORD);
  });

  it('stores the word with its scheme', () => {
    const { current, select } = setup();
    select('Rama', 'IAST');
    expect(current()).toEqual({ word: 'Rama', scheme: 'IAST' });
  });

  it('keeps the same object for the same word and scheme, so nothing refetches', () => {
    const { current, select } = setup();
    select('Rama', 'IAST');
    const first = current();
    select('Rama', 'IAST');
    expect(current()).toBe(first);

    select('', undefined);
    const empty = current();
    select('');
    expect(current()).toBe(empty);
  });

  it('treats the same word in another scheme as a new lookup', () => {
    const { current, select } = setup();
    select('Darma', 'SLP1');
    const slp1 = current();
    select('Darma');
    expect(current()).not.toBe(slp1);
    expect(current()).toEqual({ word: 'Darma', scheme: undefined });
  });
});
