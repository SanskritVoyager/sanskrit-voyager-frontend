import { useCallback, useState } from 'react';
import type { SelectedWord } from '../types/wordTypes';
import type { TransliterationScheme } from '../utils/transliterationSchemes';

export const NO_SELECTED_WORD: SelectedWord = { word: '' };

/**
 * The word being looked up and the scheme it is written in.
 *
 * `selectWord` keeps the current object when neither the word nor the scheme
 * changes. Effects that depend on the selection (fetching, the URL) rely on
 * that, as they did when the selection was a plain string: re-selecting the
 * same word does not refetch it, and an effect that re-selects on every render
 * cannot loop.
 */
export function useSelectedWord() {
  const [selectedWord, setSelectedWord] = useState<SelectedWord>(NO_SELECTED_WORD);

  const selectWord = useCallback((word: string, scheme?: TransliterationScheme) => {
    setSelectedWord((current) =>
      current.word === word && current.scheme === scheme ? current : { word, scheme }
    );
  }, []);

  return [selectedWord, selectWord] as const;
}
