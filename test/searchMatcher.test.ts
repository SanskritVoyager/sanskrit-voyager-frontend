import { afterEach, describe, expect, it } from 'vitest';
import {
  buildSearchRegExp,
  findDomMatches,
  findMatchRanges,
  foldForSearch,
} from '../src/utils/searchMatcher';

const matched = (text: string, query: string, separateWords = false) =>
  findMatchRanges(text, query, { separateWords }).map(([start, end]) => text.slice(start, end));

const rangeText = ({ range }: { range: StaticRange }) => {
  const live = document.createRange();
  live.setStart(range.startContainer, range.startOffset);
  live.setEnd(range.endContainer, range.endOffset);
  return live.toString();
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('findMatchRanges', () => {
  // Combining marks are written as escapes so the decomposed forms are unambiguous
  it.each([
    ['anga', 'aṅga'],
    ['klpta', 'kḷpta'],
    ['pitrn', 'pitṝn'],
    ['rta', 'r̥ta'], // ISO 15919 r̥: r + ring below
    ['rta', 'ṛta'],
    ['agni', 'agnī́'], // Vedic accent on ī
    ['krsna', 'kṛṣṇa'.normalize('NFD')],
    ['kṛṣṇa', 'Kṛṣṇa'],
    ['om', 'om̐'], // candrabindu
  ])('%s finds %s', (query, text) => {
    expect(matched(text, query)).toEqual([text]);
  });

  it('leaves Devanagari letters and signs alone', () => {
    const text = 'धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः';
    expect(foldForSearch(text).folded).toBe(text);
    expect(matched(text, 'क्षेत्रे')).toEqual(['धर्मक्षेत्रे', 'कुरुक्षेत्रे']);
  });

  it('grows a match to its whole word, stopping at spaces, punctuation and dandas', () => {
    expect(matched('rāmo dharmaṃ vetti।', 'dharma')).toEqual(['dharmaṃ']);
    expect(matched('vetti। rāmo', 'vet')).toEqual(['vetti']);
    expect(matched('(rāmaḥ), sītā', 'rama')).toEqual(['rāmaḥ']);
  });

  it('keeps accents after the last letter inside the match', () => {
    expect(matched('agnī́ ca', 'agni')).toEqual(['agnī́']);
  });

  it('matches a phrase across any whitespace', () => {
    expect(matched('rāmo\n  dharmaṃ vetti', 'ramo dharmam')).toEqual(['rāmo\n  dharmaṃ']);
  });

  it('matches each term on its own with separateWords', () => {
    expect(matched('rāmo dharmaṃ vetti', 'vetti ramo', true)).toEqual(['rāmo', 'vetti']);
  });

  it('treats regular expression characters in the query literally', () => {
    expect(matched('a.b (c) abc', 'a.b')).toEqual(['a.b']);
    expect(matched('a.b (c) abc', '(c)')).toEqual(['(c)']);
  });

  it('finds nothing for a query with nothing left after folding', () => {
    expect(findMatchRanges('rāmo', '')).toEqual([]);
    expect(findMatchRanges('rāmo', '   ')).toEqual([]);
    expect(findMatchRanges('rāmo', '́')).toEqual([]);
    expect(buildSearchRegExp(' ')).toBeNull();
  });
});

describe('findDomMatches', () => {
  it('matches across elements and reports the segment of each match', () => {
    document.body.innerHTML = `
      <div id="root">
        <div data-segment-number="1"><span>rāmo </span><span>dharmaṃ </span><span>vetti</span></div>
        <div data-segment-number="2"><span>dharmakṣetre </span><span>kurukṣetre</span></div>
      </div>`;
    const matches = findDomMatches(document.getElementById('root')!, 'ramo dharma');

    expect(matches.map(rangeText)).toEqual(['rāmo dharmaṃ']);
    expect(matches[0].range.startContainer).not.toBe(matches[0].range.endContainer);
    expect(matches[0].segment).toBe(1);
    expect(findDomMatches(document.getElementById('root')!, 'dharma').map((m) => m.segment))
      .toEqual([1, 2]);
  });

  it('skips ignored subtrees, scripts and styles', () => {
    document.body.innerHTML = `
      <div id="root">
        <p>rāmo</p>
        <div data-search-ignore><span>rāmo</span> 1 / 3</div>
        <script>var rāmo;</script><style>.rāmo {}</style>
      </div>`;
    const matches = findDomMatches(document.getElementById('root')!, 'ramo');

    expect(matches.map(rangeText)).toEqual(['rāmo']);
    expect(matches[0].segment).toBeNull();
  });

  it('matches words shown in another scheme by their stored text as well', () => {
    document.body.innerHTML = `
      <div id="root">
        <div data-segment-number="1"><span data-stored-text="rāmo">रामो </span><span data-stored-text="dharmaṃ"><mark>धर्मं</mark> </span><span data-stored-text="vetti">वेत्ति</span></div>
        <div data-segment-number="2"><span>English passage </span><span data-stored-text="dharmakṣetre">धर्मक्षेत्रे</span></div>
      </div>`;
    const root = document.getElementById('root')!;

    // An IAST or plain query marks the whole shown word: its letters do not line up
    expect(findDomMatches(root, 'dharma').map(rangeText)).toEqual(['धर्मं', 'धर्मक्षेत्रे']);
    expect(findDomMatches(root, 'kṣetre').map(rangeText)).toEqual(['धर्मक्षेत्रे']);
    expect(findDomMatches(root, 'dharma').map((match) => match.segment)).toEqual([1, 2]);
    // A query in the shown script finds the same words, each once
    expect(findDomMatches(root, 'धर्म').map(rangeText)).toEqual(['धर्मं', 'धर्मक्षेत्रे']);
    // A phrase runs across shown words
    expect(findDomMatches(root, 'ramo dharmam').map(rangeText)).toEqual(['रामो धर्मं']);
    // Text without a stored form is searched as shown, and found once
    expect(findDomMatches(root, 'passage').map(rangeText)).toEqual(['passage']);
  });

  it('maps offsets back through decomposed characters in the DOM', () => {
    document.body.innerHTML = `<div id="root"><span>${'kṛṣṇa'.normalize('NFD')} </span>uvāca</div>`;
    const [match] = findDomMatches(document.getElementById('root')!, 'krsna');

    expect(rangeText(match)).toBe('kṛṣṇa'.normalize('NFD'));
  });
});
