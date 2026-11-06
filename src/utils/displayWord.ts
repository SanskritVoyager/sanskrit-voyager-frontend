// Showing words from the app's own texts (book text, dictionary entries) in the
// scheme picked in the navbar. Display only: a click still looks the stored word
// up, with the scheme schemeOfSourceWord gives it.
import { schemeOfSourceWord, TransliterationScheme } from './transliterationSchemes';
import type { Transliterator } from './transliterator';

/** How a component shows a word from the app's texts (see TransliterationContext) */
export type DisplayWord = (word: string) => string;

/** Words as stored: what IAST shows, and everything until the transliterator has loaded */
export const asStored: DisplayWord = (word) => word;

/** Plain vowels carrying a Vedic accent (Macdonell, Grassmann: dhárma) */
const ACCENTED_VOWELS: Record<string, string> = {
  á: 'a',
  à: 'a',
  é: 'e',
  è: 'e',
  í: 'i',
  ì: 'i',
  ó: 'o',
  ò: 'o',
  ú: 'u',
  ù: 'u',
};
const ACCENTED_VOWEL = /[áàéèíìóòúù]/g;
/** Acute and grave left as combining marks after NFC, where no precomposed form exists (ā́) */
const COMBINING_ACCENT = new RegExp(`[${String.fromCharCode(0x0300, 0x0301)}]`, 'g');
/** Monier-Williams marks accents inside the word with / \ ^ (dha/rma) */
const MW_ACCENT = /[/\\^]/g;

/**
 * IAST the way vidyut reads it. vidyut does not read capitals (Kṛṣṇa comes out
 * as Kऋष्ण) or accents, and reads ṁ as the Vedic sign ꣳ rather than ं.
 */
export const prepareIast = (word: string): string =>
  word
    .normalize('NFC')
    .toLowerCase()
    .replace(ACCENTED_VOWEL, (vowel) => ACCENTED_VOWELS[vowel])
    .replace(COMBINING_ACCENT, '')
    .replace(MW_ACCENT, '')
    .replace(/ṁ/g, 'ṃ');

/**
 * A diaeresis marks hiatus: praüga is pra-uga (प्रउग), never the diphthong of
 * prauga (प्रौग). vidyut has no diaeresis, so each side is converted on its own.
 */
const transliterateIast = (
  transliterator: Transliterator,
  iast: string,
  to: TransliterationScheme
) =>
  iast
    .split(/(?=[ïü])/)
    .map((part) =>
      transliterator.transliterate(part.replace(/^ï/, 'i').replace(/^ü/, 'u'), 'IAST', to)
    )
    .join('');

/**
 * Kolkata is IAST with long e and o marked (ē, ō); vidyut has no Kolkata. This
 * matched sanscript's kolkata_v2 on all 68,499 distinct words of a large text.
 */
const toKolkata = (iast: string) => iast.replace(/e/g, 'ē').replace(/o/g, 'ō');

/**
 * `word` shown in the `display` scheme. IAST shows words as stored, and so do
 * words whose own scheme is uncertain (see schemeOfSourceWord).
 */
export const toDisplayWord = (
  transliterator: Transliterator,
  word: string,
  display: TransliterationScheme
): string => {
  if (display === 'IAST') return word;
  const source = schemeOfSourceWord(word);
  if (!source || source === display) return word;
  if (source === 'IAST') {
    const iast = prepareIast(word);
    // Kolkata stays Roman, so the diaeresis stays too
    return display === 'Kolkata'
      ? toKolkata(iast)
      : transliterateIast(transliterator, iast, display);
  }
  const converted = transliterator.transliterate(
    word,
    source,
    display === 'Kolkata' ? 'IAST' : display
  );
  return display === 'Kolkata' ? toKolkata(converted) : converted;
};

/** Letters with their marks, and the apostrophe that writes the avagraha (so'ham) */
const LETTER_RUN = /([\p{L}\p{M}'’]+)/u;
/** Enumerators: a lone capital (A., B) or a Roman numeral (I., IV) */
const ENUMERATOR = /^(?:[A-Z]|[IVXLCDM]+)$/;
/** A capital after the first letter: sigla (BhP, MSV,Wi), all caps, HK spellings */
const INNER_CAPITAL = /\p{L}.*\p{Lu}/u;
/** Latin letters IAST never uses */
const NOT_IAST_LETTER = /[fqwxz]/i;

/**
 * One token of running text (a word and any punctuation around it) in the display
 * scheme. Only letters are converted: vidyut reads `.` as a danda and a lone
 * capital as a vowel, so numbers (1.1, 2.5.14a), punctuation, dandas and
 * enumerators (I., A.) stay as stored. So do sigla (MSV,Wi) and Latin letters
 * IAST never uses (the x of a lacuna, clxxxviii).
 */
export const displayToken = (displayWord: DisplayWord, token: string): string => {
  if (displayWord === asStored || /[0-9]/.test(token) || INNER_CAPITAL.test(token)) return token;
  return token
    .split(LETTER_RUN)
    .map((part, index) =>
      index % 2 === 1 && !ENUMERATOR.test(part) && !NOT_IAST_LETTER.test(part)
        ? displayWord(part)
        : part
    )
    .join('');
};

/**
 * Common English words. Words that are also Sanskrit are left out: to ('to), in
 * (id before a nasal), so, he, me, no, go, hi, are, as, am, it, at, has, had, and
 * the privative a, an (a-śeṣa, an-abhiṣyandi).
 */
const ENGLISH_WORDS = new Set(
  (
    'and be been but by for from her his how into is its not of on or that the their these ' +
    'this those was were what when where which who whose why with book canto chapter ' +
    'commentary contents edition end index note notes page part section story verse verses'
  ).split(' ')
);
/** Where a line breaks into words: spaces, punctuation, dandas. The avagraha apostrophe stays. */
const WORD_BREAKS = /[\s.,;:!?()[\]{}"“”|/।॥]+/;
/** Roman numerals (cdxvi) and lacunae (xxxx): not words */
const ROMAN_NUMERAL = /^[ivxlcdm]+$/;
const LATIN_WORD = /^[\p{Script=Latin}'’-]+$/u;
/**
 * Spelled as IAST never is: f q w x z, two vowels in a row other than ai and au
 * (Marriage), or an ending no Sanskrit word has (abstract, morning). Endings in y
 * and v are left alone: Sanskrit has them before a vowel (ity, astv).
 */
const NOT_IAST_SPELLING = /[fqwxz]|(?!ai|au)[aeiou]{2}|(?:ct|st|nt|nd|ld|rd|ng|ck|sh|ts|ll|ss)$/;
/** Punctuation left around a word */
const AROUND_WORD = /^[^\p{L}]+|[^\p{L}]+$/gu;

/**
 * True for a line that reads as English rather than Sanskrit: at least one word
 * in five is a common English word, or is spelled as IAST never is. Tokens with
 * digits (HV_79.17a), sigla and Roman numerals are not counted.
 */
export const looksLikeEnglish = (text: string): boolean => {
  let words = 0;
  let english = 0;
  text
    .normalize('NFC')
    .split(WORD_BREAKS)
    .forEach((token) => {
      if (!token || /[0-9]/.test(token) || INNER_CAPITAL.test(token)) return;
      const word = token.toLowerCase().replace(AROUND_WORD, '');
      if (!word || ROMAN_NUMERAL.test(word)) return;
      words += 1;
      if (ENGLISH_WORDS.has(word) || (LATIN_WORD.test(word) && NOT_IAST_SPELLING.test(word))) {
        english += 1;
      }
    });
  return english > 0 && english * 5 >= words;
};

/** A letter outside ASCII, or a mark: IAST diacritics, Devanagari */
const NON_ASCII_LETTER = /[^\P{L}\p{ASCII}]|\p{M}/u;

/**
 * True for a heading to convert. More than half of the corpus's headings are
 * English ("Chapter 3", "7.1.7. Marriage", "Corporal Punishment"), so a heading
 * converts only with letters plain English lacks (IAST diacritics, Devanagari)
 * and nothing that reads as English.
 */
export const isSanskritHeading = (text: string): boolean =>
  NON_ASCII_LETTER.test(text.normalize('NFC')) && !looksLikeEnglish(text);

/** Texts shown per scheme: a new scheme gets a new displayWord, and the old map goes */
const shownTexts = new WeakMap<DisplayWord, Map<string, string>>();
const SHOWN_TEXTS_LIMIT = 200_000;

/** Each whitespace-separated token of `text` in the display scheme */
export const displaySanskrit = (displayWord: DisplayWord, text: string): string => {
  if (displayWord === asStored) return text;
  // A book repeats its words: each text is worked out once per scheme
  let shown = shownTexts.get(displayWord);
  if (!shown) {
    shown = new Map();
    shownTexts.set(displayWord, shown);
  }
  let display = shown.get(text);
  if (display === undefined) {
    if (shown.size >= SHOWN_TEXTS_LIMIT) shown.clear();
    display = text
      .split(/(\s+)/)
      .map((token, index) => (index % 2 === 1 ? token : displayToken(displayWord, token)))
      .join('');
    shown.set(text, display);
  }
  return display;
};

/** A heading in the display scheme, or as stored when it may be English (isSanskritHeading) */
export const displayHeading = (displayWord: DisplayWord, text: string): string =>
  displayWord === asStored || !isSanskritHeading(text) ? text : displaySanskrit(displayWord, text);
