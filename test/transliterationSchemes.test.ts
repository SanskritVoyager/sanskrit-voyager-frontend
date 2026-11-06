import { describe, expect, it } from 'vitest';
import {
  TRANSLITERATION_SCHEMES,
  parseTransliterationScheme,
  schemeOfSourceWord,
} from '../src/utils/transliterationSchemes';

describe('parseTransliterationScheme', () => {
  it('accepts every scheme of the selector, ignoring case', () => {
    for (const { value } of TRANSLITERATION_SCHEMES) {
      expect(parseTransliterationScheme(value)).toBe(value);
      expect(parseTransliterationScheme(value.toLowerCase())).toBe(value);
    }
    expect(parseTransliterationScheme('devanagari')).toBe('DEVANAGARI');
    expect(parseTransliterationScheme('TAMIL')).toBe('Tamil');
  });

  it('rejects anything else, so a hand-edited URL falls back to auto-detection', () => {
    for (const value of ['nope', 'velthuis', 'schemes', '', null, undefined]) {
      expect(parseTransliterationScheme(value)).toBeUndefined();
    }
  });
});

describe('schemeOfSourceWord', () => {
  it('reads book and dictionary words as IAST', () => {
    for (const word of ['dharma', 'kṛṣṇa', 'yogaś', 'saṃskṛtam', 'r̥ṣi', 'so’nupalambhena']) {
      expect(schemeOfSourceWord(word)).toBe('IAST');
    }
  });

  it('keeps a capitalized name IAST, which auto-detection reads as Harvard-Kyoto', () => {
    // auto-detection turns these into ṛama, ḍevadatta, ṭama
    for (const word of ['Rama', 'Devadatta', 'Tama', 'Ṛgveda', '‘Rama']) {
      expect(schemeOfSourceWord(word)).toBe('IAST');
    }
  });

  it('reads Devanagari words as Devanagari, Vedic accents and mixed Macdonell tags included', () => {
    for (const word of ['धर्म', 'अ॒ग्निम्', 'योगश्चित्तवृत्तिनिरोधः', 'धर्म-dhár']) {
      expect(schemeOfSourceWord(word)).toBe('DEVANAGARI');
    }
  });

  it('leaves ISO 15919 / Kolkata words to auto-detection, composed or not', () => {
    // long ē/ō: SARIT Kādambarī and Nalacampū
    for (const word of ['dēva', 'kōpa', 'Ēka', 'dēva'.normalize('NFD')]) {
      expect(schemeOfSourceWord(word)).toBeUndefined();
    }
  });

  it('reads decomposed IAST as IAST', () => {
    expect(schemeOfSourceWord('kṛṣṇa'.normalize('NFD'))).toBe('IAST');
    expect(schemeOfSourceWord('Ṛgveda'.normalize('NFD'))).toBe('IAST');
  });

  it('leaves words with a capital after the first letter to auto-detection', () => {
    // sigla, all caps, and Harvard-Kyoto spellings found in the corpus
    for (const word of ['BhP', 'ŚŚS', 'VidSrk', 'COPYRIGHT', 'pratyAhAra', 'kRSNa']) {
      expect(schemeOfSourceWord(word)).toBeUndefined();
    }
  });
});
