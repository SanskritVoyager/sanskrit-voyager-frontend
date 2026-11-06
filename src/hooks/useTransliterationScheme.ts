import { useCallback, useState } from 'react';
import { parseTransliterationScheme, TransliterationScheme } from '../utils/transliterationSchemes';

/** localStorage key of the scheme picked in the navbar */
export const SCHEME_STORAGE_KEY = 'transliteration-scheme';

const readSavedScheme = (): TransliterationScheme => {
  try {
    return parseTransliterationScheme(window.localStorage.getItem(SCHEME_STORAGE_KEY)) ?? 'IAST';
  } catch {
    // Storage blocked: a private window, or site data disabled
    return 'IAST';
  }
};

/**
 * The scheme picked in the navbar, saved in localStorage so it survives a
 * reload. It is read for the first render, so a saved Devanagari never shows
 * IAST first. An unknown saved value, or storage the browser blocks, gives
 * IAST. Tabs already open keep their own choice until they reload: syncing a
 * live tab would convert its dictionary but not the text in its analysis box.
 */
export function useTransliterationScheme() {
  const [scheme, setScheme] = useState<TransliterationScheme>(readSavedScheme);

  const pickScheme = useCallback((next: TransliterationScheme) => {
    setScheme(next);
    try {
      window.localStorage.setItem(SCHEME_STORAGE_KEY, next);
    } catch {
      // Not saved: the choice still holds until the page reloads
    }
  }, []);

  return [scheme, pickScheme] as const;
}
