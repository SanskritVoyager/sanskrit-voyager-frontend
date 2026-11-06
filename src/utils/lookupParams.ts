// The dictionary lookup lives in the query string (?w=…&input_scheme=…&dicts=…)
// rather than a path segment, so it layers on top of the book/text route instead
// of replacing it: you can look a word up while reading.
//
// The scheme is part of the lookup. Without it a shared link would make the
// backend guess again, and `Rama` from an IAST book would come back as `ṛama`.
// mw is the default dictionary, so a bare-mw (or empty) selection is omitted;
// any other set is encoded in full (mw included if it's there alongside others).
import type { SelectedWord } from '../types/wordTypes';
import { parseTransliterationScheme } from './transliterationSchemes';

export const WORD_PARAM = 'w';
export const SCHEME_PARAM = 'input_scheme';
export const DICTIONARIES_PARAM = 'dicts';

export type Lookup = {
  selectedWord: SelectedWord;
  dictionaries: string[];
};

const isDefaultDictionaries = (dictionaries: string[]) =>
  dictionaries.length === 0 || (dictionaries.length === 1 && dictionaries[0] === 'mw');

/** The lookup a URL describes. An unknown scheme falls back to auto-detection. */
export const readLookup = (params: URLSearchParams): Lookup => {
  const word = params.get(WORD_PARAM) ?? '';
  const dictionaries = params.get(DICTIONARIES_PARAM)?.split(',').filter(Boolean) ?? [];
  // Without a word there is nothing for a scheme to describe
  const scheme = word ? parseTransliterationScheme(params.get(SCHEME_PARAM)) : undefined;
  return { selectedWord: { word, scheme }, dictionaries };
};

/** `params` with the lookup written into it; other parameters are kept */
export const writeLookup = (params: URLSearchParams, lookup: Lookup): URLSearchParams => {
  const next = new URLSearchParams(params);
  const { word, scheme } = lookup.selectedWord;
  if (word) next.set(WORD_PARAM, word);
  else next.delete(WORD_PARAM);
  if (word && scheme) next.set(SCHEME_PARAM, scheme);
  else next.delete(SCHEME_PARAM);
  if (isDefaultDictionaries(lookup.dictionaries)) next.delete(DICTIONARIES_PARAM);
  else next.set(DICTIONARIES_PARAM, lookup.dictionaries.join(','));
  return next;
};
