// Transliteration schemes, spelled the way the backend accepts them.
//
// The analysis box converts its text into one of these (the selector in
// NavbarSimple), and a lookup sends the scheme its word is written in as
// `input_scheme`, so the backend does not have to guess. Its auto-detection
// misreads short ASCII words: SLP1 `Darma` comes back as Harvard-Kyoto `ḍarma`,
// and IAST `Rama` as `ṛama`.

export const TRANSLITERATION_SCHEMES = [
  { value: 'IAST', label: 'Roman (IAST)' },
  { value: 'DEVANAGARI', label: 'Devanagari' },
  { value: 'HK', label: 'Harvard-Kyoto (HK)' },
  { value: 'SLP1', label: 'SLP1 (Sanskrit Library Phonetic)' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Kolkata', label: 'Kolkata' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'Kannada', label: 'Kannada' },
  { value: 'WX', label: 'WX' },
  { value: 'ITRANS', label: 'ITRANS' },
] as const;

export type TransliterationScheme = (typeof TRANSLITERATION_SCHEMES)[number]['value'];

const SCHEMES_BY_LOWERCASE = new Map<string, TransliterationScheme>(
  TRANSLITERATION_SCHEMES.map(({ value }) => [value.toLowerCase(), value])
);

/** The scheme `value` names, ignoring case, or undefined for anything else */
export const parseTransliterationScheme = (
  value: string | null | undefined
): TransliterationScheme | undefined =>
  value ? SCHEMES_BY_LOWERCASE.get(value.toLowerCase()) : undefined;

/** Devanagari letters, signs and digits, Vedic accents and extensions included */
const DEVANAGARI = /\p{Script_Extensions=Devanagari}/u;
/** Long ē/ō belong to ISO 15919 / Kolkata romanization, not IAST */
const LONG_E_O = /[ēōĒŌ]/;
/** A capital after the first letter: all caps, a siglum (BhP, ŚŚS), or an ASCII scheme such as HK */
const INNER_CAPITAL = /\p{L}.*\p{Lu}/u;

/**
 * The scheme of a word taken from the app's own texts: book text and
 * dictionary entries.
 *
 * Those are IAST or Devanagari, so the backend is told which. Two kinds of
 * word may be neither and keep the backend's auto-detection (undefined):
 * - a word with long ē/ō, from the few SARIT texts romanized ISO-style
 *   (Kādambarī, Nalacampū), which the backend detects as Kolkata;
 * - a word with a capital after its first letter, where IAST only ever
 *   capitalizes the first. A capitalized name (Rama) is still IAST.
 */
export const schemeOfSourceWord = (word: string): TransliterationScheme | undefined => {
  // Some book files are decomposed (NFD), where ē is e + a combining macron
  const composed = word.normalize('NFC');
  if (DEVANAGARI.test(composed)) return 'DEVANAGARI';
  if (LONG_E_O.test(composed) || INNER_CAPITAL.test(composed)) return undefined;
  return 'IAST';
};
