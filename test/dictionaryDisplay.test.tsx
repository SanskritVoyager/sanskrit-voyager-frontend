import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '../test-utils';
import { TransliterationProvider } from '../src/context/TransliterationContext';
import DictionaryEntry from '../src/components/WordEntries/DictionaryEntry';
import InflectionTable from '../src/components/WordEntries/InflectionTable';
import type { TransliterationScheme } from '../src/utils/transliterationSchemes';

// jsdom cannot fetch the module, so the provider gets the build from disk. The
// factory must not import anything that imports this module, or it waits on itself.
vi.mock('../src/utils/transliterator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/transliterator')>();
  const { readTransliteratorWasm } = await import('../test-utils/transliteratorWasm');
  const loaded = actual.instantiateTransliterator(readTransliteratorWasm());
  return { ...actual, loadTransliterator: () => loaded };
});

afterEach(cleanup);

const inScheme = (scheme: TransliterationScheme, ui: React.ReactNode) => (
  <TransliterationProvider scheme={scheme}>{ui}</TransliterationProvider>
);

// Apte's entry for dharman, as /process_new returns it
const ENTRY =
  '<s>dharman</s>  <i><ab>Masculine.</ab></i> [<s>dhṛ-manin</s>]  A preserver, maintainer.';

// The 24 forms of dharma, as /process_new returns them
const DHARMA_FORMS = [
  'dharmaḥ',
  'dharmau',
  'dharmāḥ',
  'dharmam',
  'dharmau',
  'dharmān',
  'dharmeṇa',
  'dharmābhyām',
  'dharmaiḥ',
  'dharmāya',
  'dharmābhyām',
  'dharmebhyaḥ',
  'dharmāt',
  'dharmābhyām',
  'dharmebhyaḥ',
  'dharmasya',
  'dharmayoḥ',
  'dharmāṇām',
  'dharme',
  'dharmayoḥ',
  'dharmeṣu',
  'dharma',
  'dharmau',
  'dharmāḥ',
];

describe('dictionary entries in the picked scheme', () => {
  it('shows Sanskrit in Devanagari and leaves the English alone', async () => {
    render(inScheme('DEVANAGARI', <DictionaryEntry entry={ENTRY} />));
    expect(await screen.findByText('धर्मन्')).toBeInTheDocument();
    expect(screen.getByText('धृ')).toBeInTheDocument();
    expect(screen.getByText('मनिन्')).toBeInTheDocument();
    expect(screen.getByText(/A preserver, maintainer/)).toBeInTheDocument();
  });

  it('looks up the stored IAST word, not the one shown', async () => {
    const onWordClick = vi.fn();
    render(inScheme('DEVANAGARI', <DictionaryEntry entry={ENTRY} onWordClick={onWordClick} />));
    fireEvent.click(await screen.findByText('धर्मन्'));
    expect(onWordClick).toHaveBeenCalledWith('dharman', expect.any(Number));
  });

  it('converts names, which are capitalized', async () => {
    const onWordClick = vi.fn();
    render(inScheme('HK', <DictionaryEntry entry="<s1>Kṛṣṇa</s1>" onWordClick={onWordClick} />));
    fireEvent.click(await screen.findByText('kRSNa'));
    expect(onWordClick).toHaveBeenCalledWith('kṛṣṇa', expect.any(Number));
  });

  it('converts the bold headword that starts a Grassmann or Edgerton entry', async () => {
    // Grassmann, as /process_new returns it
    const { unmount } = render(
      inScheme(
        'DEVANAGARI',
        <DictionaryEntry entry="<b>kṛ́ṣṇa,</b>  <ab>masculinum</ab> (eigentlich der Schwarze)" />
      )
    );
    expect(await screen.findByText('कृष्ण,')).toBeInTheDocument();
    expect(screen.getByText(/eigentlich der Schwarze/)).toBeInTheDocument();
    unmount();

    // Edgerton: a homonym number first, and later bold that is not the headword
    const { container } = render(
      inScheme(
        'HK',
        <DictionaryEntry entry="<hom>2</hom> <b>Dharma</b> , as <ab>proper name.</ab>, (<b>1</b>) <b>dharmā</b>" />
      )
    );
    expect(await screen.findByText('dharma')).toBeInTheDocument();
    expect(container.textContent).toContain('(1)');
    expect(screen.getByText('dharmā')).toBeInTheDocument();
  });

  it("shows Macdonell's own romanization as printed beside the converted Devanagari", async () => {
    // Not IAST (sh for ṣ), and split by <lex>: converted it came out as क्रिस्ह्-न्अ
    const entry = '<s>कृष्ण k<lex>ri</lex>sh-<lex>n</lex>á</s> <lex>n.</lex> black';
    const { container, unmount } = render(inScheme('HK', <DictionaryEntry entry={entry} />));
    expect(await screen.findByText('kRSNa')).toBeInTheDocument();
    expect(container.textContent).toContain('kRSNa krish-ná');
    unmount();

    const devanagari = render(inScheme('DEVANAGARI', <DictionaryEntry entry={entry} />));
    expect(devanagari.container.textContent).toContain('कृष्ण krish-ná');
  });

  it('shows entries as stored while IAST is picked', () => {
    render(inScheme('IAST', <DictionaryEntry entry={ENTRY} />));
    expect(screen.getByText('dharman')).toBeInTheDocument();
  });

  it('converts inflection tables, including after a render without forms', async () => {
    const { rerender } = render(
      inScheme('DEVANAGARI', <InflectionTable inflection_wordsIAST={null} rowcolstitles={null} />)
    );
    // The hook runs before the table's early returns, so the hook order holds
    rerender(
      inScheme(
        'DEVANAGARI',
        <InflectionTable inflection_wordsIAST={DHARMA_FORMS} rowcolstitles={[['Inst', 'Sg']]} />
      )
    );
    expect(await screen.findByText('धर्मेण')).toBeInTheDocument();
    expect(screen.getByText('धर्मस्य')).toBeInTheDocument();
  });
});
