import { beforeAll, describe, expect, it } from 'vitest';
import {
  asStored,
  displayHeading,
  displaySanskrit,
  displayToken,
  isSanskritHeading,
  looksLikeEnglish,
  toDisplayWord,
} from '../src/utils/displayWord';
import type { TransliterationScheme } from '../src/utils/transliterationSchemes';
import type { Transliterator } from '../src/utils/transliterator';
import { loadTestTransliterator } from '../test-utils/transliterator';

let transliterator: Transliterator;

beforeAll(async () => {
  transliterator = await loadTestTransliterator();
});

const show = (word: string, display: TransliterationScheme) =>
  toDisplayWord(transliterator, word, display);

/** ā with a combining acute: no precomposed form exists */
const ACCENTED_LONG_A = `ā${String.fromCharCode(0x0301)}`;

describe('toDisplayWord', () => {
  it('shows words as stored while IAST is picked', () => {
    for (const word of ['Kṛṣṇa', 'dha/rma', 'saṁskṛta', 'धर्म']) {
      expect(show(word, 'IAST')).toBe(word);
    }
  });

  it('converts IAST into Devanagari', () => {
    expect(show('dharma', 'DEVANAGARI')).toBe('धर्म');
    expect(show('dharmeṇa', 'DEVANAGARI')).toBe('धर्मेण');
  });

  it('lowercases first, which vidyut needs (Kṛṣṇa would come out as Kऋष्ण)', () => {
    expect(show('Kṛṣṇa', 'DEVANAGARI')).toBe('कृष्ण');
    expect(show('Kṛṣṇa', 'HK')).toBe('kRSNa');
  });

  it('reads decomposed text', () => {
    expect(show('kṛṣṇa'.normalize('NFD'), 'DEVANAGARI')).toBe('कृष्ण');
  });

  it('shows ṁ as the anusvāra, not the Vedic sign ꣳ', () => {
    expect(show('saṁskṛta', 'DEVANAGARI')).toBe('संस्कृत');
  });

  it('keeps the two vowels of a diaeresis apart', () => {
    // praüga is pra-uga; prauga would be the diphthong au, प्रौग
    expect(show('praüga', 'DEVANAGARI')).toBe('प्रउग');
  });

  it('drops dictionary accent marks', () => {
    expect(show('dhár', 'DEVANAGARI')).toBe('धर्'); // Macdonell's acute
    expect(show(ACCENTED_LONG_A, 'DEVANAGARI')).toBe('आ');
    expect(show('dha/rma', 'DEVANAGARI')).toBe('धर्म'); // Monier-Williams's slash
    // DictionaryEntry splits dha/rma into dha, /, rma; the pieces still join up
    expect(['dha', '/', 'rma'].map((piece) => show(piece, 'DEVANAGARI')).join('')).toBe('धर्म');
  });

  it('converts Devanagari words into other schemes', () => {
    expect(show('धर्म', 'HK')).toBe('dharma');
    expect(show('धर्म', 'DEVANAGARI')).toBe('धर्म');
  });

  it('shows Kolkata as IAST with long e and o marked', () => {
    expect(show('devaḥ', 'Kolkata')).toBe('dēvaḥ');
    expect(show('Yogaḥ', 'Kolkata')).toBe('yōgaḥ');
    expect(show('vaidya kauśalya', 'Kolkata')).toBe('vaidya kauśalya');
    expect(show('देवः', 'Kolkata')).toBe('dēvaḥ');
    expect(show('praüga', 'Kolkata')).toBe('praüga');
  });

  it('leaves words whose own scheme is uncertain as stored', () => {
    for (const word of ['BhP', 'pratyAhAra', 'dēva']) {
      expect(show(word, 'DEVANAGARI')).toBe(word);
    }
  });
});

describe('displayToken', () => {
  const devanagari = (token: string) =>
    displayToken((word) => toDisplayWord(transliterator, word, 'DEVANAGARI'), token);

  it('converts the letters and keeps the punctuation around them', () => {
    expect(devanagari('agní,')).toBe('अग्नि,');
    expect(devanagari('(iti)')).toBe('(इति)');
    expect(devanagari('°dharma°')).toBe('°धर्म°');
    expect(devanagari("'pi")).toBe('ऽपि'); // the apostrophe writes the avagraha
  });

  it('keeps numbers and references, which vidyut would give dandas (१।१)', () => {
    for (const token of ['1.1', '2.5.14a', 'HV_79.17a', '12']) {
      expect(devanagari(token)).toBe(token);
    }
  });

  it('keeps sigla, enumerators and letters IAST never uses', () => {
    // A lone capital would be read as a vowel: I. as इ।
    for (const token of ['I.', 'A.', 'VI.', 'MSV,Wi', 'Bhaiṣ-v(Ch/W)', 'xxxx', 'clxxxviii']) {
      expect(devanagari(token)).toBe(token);
    }
    expect(devanagari('clxxxviii.samānabhāvam')).toBe('clxxxviii.समानभावम्');
  });

  it('leaves everything as stored while IAST is picked', () => {
    expect(displayToken(asStored, 'agní,')).toBe('agní,');
    expect(displaySanskrit(asStored, 'tataḥ pradīpa-vrajyā')).toBe('tataḥ pradīpa-vrajyā');
  });
});

describe('looksLikeEnglish', () => {
  it('finds English lines among the original text', () => {
    for (const line of [
      'Chapter 13',
      'For a four-pada verse:',
      'Not found in all editions.',
      '(extant text from SHT 4473v2).',
      'END OF COMMENTARY',
      '<story of Sudarśana>',
      'fol. 238r1 = GBM 6.788',
    ]) {
      expect(looksLikeEnglish(line), line).toBe(line !== 'END OF COMMENTARY');
    }
    // All caps is never converted anyway: schemeOfSourceWord leaves it as stored
  });

  it('reads Sanskrit as Sanskrit, with the words it shares with English', () => {
    for (const line of [
      "kāraṇābhiniveśo 'to duḥkhadṛggheya eva saḥ // VAkK_5.8 //", // 'to
      'tato vaivasvataṃ devaṃ  HV_79.17a', // the a of a reference
      'a-śeṣa-lūtā-kīṭānām a-gadaḥ sārvakārmikaḥ |', // the privative a-
      'dravoṣṇam an-abhiṣyandi nāti-snigdham a-saṅkaram || 25 ||',
      'vi hotrā dadhe vayunāvid eka in', // id before a nasal
      'are drakṣyāmi te vīryam', // the interjection are
      'ity uktvā so ’pi tatraiva', // ity, so
      'xxxxxxxxxxxxx पाञ्चालानभिघावति ।', // a lacuna
      'clxxxviii.samānabhāvamakṣamī śineḥ sutātmajaḥ śaram |', // a Roman numeral
    ]) {
      expect(looksLikeEnglish(line), line).toBe(false);
    }
  });
});

describe('isSanskritHeading', () => {
  it('converts Sanskrit headings', () => {
    for (const heading of [
      'dvātriṃśas sargaḥ',
      'I. tatra katamat karma alpāyuḥsaṃvartanīyam?',
      '5. Prakaraṇa: Upaśānti',
      "caturtho 'dhyāyaḥ",
      '(आगममात्रेण न मुक्तिः)—',
    ]) {
      expect(isSanskritHeading(heading), heading).toBe(true);
    }
  });

  it('leaves English headings, and plain ASCII ones, as stored', () => {
    for (const heading of [
      'Chapter 223',
      'Section 1',
      'Chapter 163: Śākalya, a devotee of Viṣṇu, and the Rākṣasa Paraśu',
      '7.1.7. Marriage',
      '8.1.15.4. Corporal Punishment',
      'i.e., Tattvasamāsa, an abstract of Sāṃkhya philosophy',
      '19. Hastin',
    ]) {
      expect(isSanskritHeading(heading), heading).toBe(false);
    }
  });

  it('shows a Sanskrit heading converted word by word, keeping enumerators', () => {
    const devanagari = (word: string) => toDisplayWord(transliterator, word, 'DEVANAGARI');
    expect(displayHeading(devanagari, 'I. tatra katamat karma alpāyuḥsaṃvartanīyam?')).toBe(
      'I. तत्र कतमत् कर्म अल्पायुःसंवर्तनीयम्?'
    );
    // Without a diacritic it could be English: as stored
    expect(displayHeading(devanagari, 'I. tatra katamat karma')).toBe('I. tatra katamat karma');
    expect(displayHeading(devanagari, '26. tataḥ pradīpa-vrajyā')).toBe('26. ततः प्रदीप-व्रज्या');
    expect(displayHeading(devanagari, 'Section 2')).toBe('Section 2');
  });
});
