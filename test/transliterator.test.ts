import { beforeAll, describe, expect, it } from 'vitest';
import type { Transliterator } from '../src/utils/transliterator';
import { loadTestTransliterator } from '../test-utils/transliterator';

let transliterator: Transliterator;

beforeAll(async () => {
  transliterator = await loadTestTransliterator();
});

const t = (
  text: string,
  from: Parameters<Transliterator['transliterate']>[1],
  to: Parameters<Transliterator['transliterate']>[2]
) => transliterator.transliterate(text, from, to);

describe('transliterator (vidyut-lipi WebAssembly build)', () => {
  it('converts IAST into every scheme of the selector it knows', () => {
    const expected = {
      DEVANAGARI: ['धर्म', 'कृष्ण'],
      SLP1: ['Darma', 'kfzRa'],
      HK: ['dharma', 'kRSNa'],
      WX: ['Xarma', 'kqRNa'],
      ITRANS: ['dharma', 'kRRiShNa'],
      Tamil: ['த⁴ர்ம', 'க்ருʼஷ்ண'],
      Bengali: ['ধর্ম', 'কৃষ্ণ'],
      Kannada: ['ಧರ್ಮ', 'ಕೃಷ್ಣ'],
    } as const;
    for (const [scheme, [dharma, krsna]] of Object.entries(expected)) {
      const to = scheme as keyof typeof expected;
      expect(t('dharma', 'IAST', to)).toBe(dharma);
      expect(t('kṛṣṇa', 'IAST', to)).toBe(krsna);
    }
  });

  it('converts Devanagari', () => {
    expect(t('धर्मक्षेत्रे', 'DEVANAGARI', 'HK')).toBe('dharmakSetre');
    expect(t('देवः', 'DEVANAGARI', 'IAST')).toBe('devaḥ');
  });

  it('returns the text unchanged for Kolkata, which vidyut lacks', () => {
    expect(t('deva', 'IAST', 'Kolkata')).toBe('deva');
  });

  it('handles empty text', () => {
    expect(t('', 'IAST', 'DEVANAGARI')).toBe('');
  });

  it('keeps working after a long text grows its memory', () => {
    const long = 'dharmakṣetre kurukṣetre '.repeat(60000);
    expect(t(long, 'IAST', 'DEVANAGARI').startsWith('धर्मक्षेत्रे कुरुक्षेत्रे ')).toBe(true);
    expect(t('yoga', 'IAST', 'DEVANAGARI')).toBe('योग');
  });
});
