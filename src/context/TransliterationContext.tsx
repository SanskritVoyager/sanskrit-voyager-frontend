import React, {
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { asStored, DisplayWord, toDisplayWord } from '../utils/displayWord';
import type { TransliterationScheme } from '../utils/transliterationSchemes';
import { loadTransliterator, Transliterator } from '../utils/transliterator';

const DisplayWordContext = createContext<DisplayWord>(asStored);

/**
 * Distinct words kept converted per scheme. The Ṛgveda has 23,000 distinct
 * words among 489,000; past this many the cache starts again.
 */
const CACHE_LIMIT = 200_000;

/** `word` → display form, converted once per word and scheme */
const cachedDisplayWord = (
  transliterator: Transliterator,
  scheme: TransliterationScheme
): DisplayWord => {
  const shown = new Map<string, string>();
  return (word) => {
    let display = shown.get(word);
    if (display === undefined) {
      if (shown.size >= CACHE_LIMIT) shown.clear();
      display = toDisplayWord(transliterator, word, scheme);
      shown.set(word, display);
    }
    return display;
  };
};

/**
 * Gives the book reader and the dictionary the scheme picked in the navbar. The
 * transliterator is fetched on the first switch away from IAST; until it has
 * arrived, or if it fails to, words are shown as stored.
 */
export function TransliterationProvider({
  scheme,
  children,
}: {
  scheme: TransliterationScheme;
  children: React.ReactNode;
}) {
  const [transliterator, setTransliterator] = useState<Transliterator | null>(null);
  // A switch redraws every word of an open book, the largest about 490,000. The
  // texts follow at low priority, so the selector itself answers at once.
  const shownScheme = useDeferredValue(scheme);
  const wanted = scheme !== 'IAST';

  useEffect(() => {
    if (!wanted || transliterator) return undefined;
    let cancelled = false;
    loadTransliterator()
      .then((loaded) => {
        if (!cancelled) setTransliterator(loaded);
      })
      .catch((error) => console.error('Could not load the transliterator:', error));
    return () => {
      cancelled = true;
    };
  }, [wanted, transliterator]);

  const displayWord = useMemo<DisplayWord>(
    () =>
      transliterator && shownScheme !== 'IAST'
        ? cachedDisplayWord(transliterator, shownScheme)
        : asStored,
    [transliterator, shownScheme]
  );

  return <DisplayWordContext.Provider value={displayWord}>{children}</DisplayWordContext.Provider>;
}

/**
 * How to show a word from the app's texts. While IAST is picked this is
 * `asStored`, so a component can skip conversion with `displayWord === asStored`.
 */
export const useDisplayWord = () => useContext(DisplayWordContext);
