import { describe, expect, it } from 'vitest';
import { readLookup, writeLookup } from '../src/utils/lookupParams';

const params = (query: string) => new URLSearchParams(query);

describe('readLookup', () => {
  it('reads the word, its scheme and the dictionaries', () => {
    expect(readLookup(params('w=Rama&input_scheme=IAST&dicts=mw,ap90'))).toEqual({
      selectedWord: { word: 'Rama', scheme: 'IAST' },
      dictionaries: ['mw', 'ap90'],
    });
  });

  it('leaves the scheme to auto-detection for older links and unknown values', () => {
    expect(readLookup(params('w=dharma')).selectedWord).toEqual({ word: 'dharma' });
    expect(readLookup(params('w=dharma&input_scheme=nope')).selectedWord.scheme).toBeUndefined();
  });

  it('accepts a scheme in any case', () => {
    expect(readLookup(params('w=Darma&input_scheme=slp1')).selectedWord.scheme).toBe('SLP1');
  });

  it('ignores a scheme without a word', () => {
    expect(readLookup(params('input_scheme=IAST')).selectedWord).toEqual({ word: '' });
  });

  it('reads no dictionaries as the default', () => {
    expect(readLookup(params('')).dictionaries).toEqual([]);
    expect(readLookup(params('dicts=,mw,')).dictionaries).toEqual(['mw']);
  });
});

describe('writeLookup', () => {
  it('writes the word and its scheme, and keeps other parameters', () => {
    const next = writeLookup(params('q=1'), {
      selectedWord: { word: 'Rama', scheme: 'IAST' },
      dictionaries: ['mw', 'ap90'],
    });
    expect(next.get('q')).toBe('1');
    expect(next.get('w')).toBe('Rama');
    expect(next.get('input_scheme')).toBe('IAST');
    expect(next.get('dicts')).toBe('mw,ap90');
  });

  it('drops a stale scheme when the new word has none', () => {
    const next = writeLookup(params('w=Rama&input_scheme=IAST'), {
      selectedWord: { word: 'karma' },
      dictionaries: [],
    });
    expect(next.toString()).toBe('w=karma');
  });

  it('removes the lookup when no word is selected', () => {
    const next = writeLookup(params('w=Rama&input_scheme=IAST&dicts=ap90&q=1'), {
      selectedWord: { word: '', scheme: 'IAST' },
      dictionaries: ['mw'],
    });
    expect(next.toString()).toBe('q=1');
  });

  it('round-trips through readLookup', () => {
    const lookup = {
      selectedWord: { word: 'धर्म', scheme: 'DEVANAGARI' as const },
      dictionaries: ['ddsa'],
    };
    expect(readLookup(writeLookup(params(''), lookup))).toEqual(lookup);
  });
});
