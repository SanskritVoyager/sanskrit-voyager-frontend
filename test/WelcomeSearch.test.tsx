import React from 'react';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, userEvent } from '../test-utils';
import { WelcomeSearch } from '../src/components/Welcome/WelcomeSearch';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

const TITLES = ['sa_abhinavagupta-bhairavastava', 'sa_patañjali-yogasūtra', 'sa_yogavāsiṣṭha'];
const HEADWORDS = ['yoga', 'yogā', 'yogakṣema', 'yogin', 'sāṃkhya', 'saṃkhyā', 'śiva', 'citta'];

const setup = () => {
  const onLookupWord = vi.fn();
  const onSearchTexts = vi.fn();
  render(<WelcomeSearch onLookupWord={onLookupWord} onSearchTexts={onSearchTexts} />);
  return {
    user: userEvent.setup(),
    input: screen.getByRole('textbox'),
    onLookupWord,
    onSearchTexts,
  };
};

const option = (name: string | RegExp) => screen.findByRole('option', { name });

describe('WelcomeSearch', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => (url.includes('titles') ? TITLES : HEADWORDS),
      }))
    );
  });

  afterEach(() => {
    cleanup();
    navigate.mockClear();
  });

  it('groups book, headword and search suggestions for one query', async () => {
    const { user, input } = setup();
    await user.type(input, 'yoga');

    const books = within(await screen.findByText('Books').then((label) => label.parentElement!));
    expect(books.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Yogavāsiṣṭha',
      'Patañjali Yogasūtra',
    ]);

    const dictionary = within(screen.getByText('Dictionary').parentElement!);
    expect(dictionary.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'yogaEnter',
      'yogā',
      'yogakṣema',
    ]);

    expect(await option('Search all texts for “yoga”')).toBeInTheDocument();
    // The free lookup would repeat the 'yoga' row
    expect(screen.queryByRole('option', { name: /Look up/ })).toBeNull();
  });

  it('looks up the typed headword on Enter', async () => {
    const { user, input, onLookupWord } = setup();
    await user.type(input, 'yoga');
    await option('yogā');
    await user.keyboard('{Enter}');
    expect(onLookupWord).toHaveBeenCalledWith('yoga');
  });

  it('opens an exactly matching book on Enter', async () => {
    const { user, input, onLookupWord } = setup();
    await user.type(input, 'yogavasistha');
    await option(/Yogavāsiṣṭha/);
    await user.keyboard('{Enter}');
    expect(navigate).toHaveBeenCalledWith('/book/yogavasistha');
    expect(onLookupWord).not.toHaveBeenCalled();
  });

  it('searches the texts on Enter when nothing matches exactly', async () => {
    const { user, input, onSearchTexts } = setup();
    await user.type(input, 'yogena cittavṛtti');
    expect(await option(/Search all texts/)).toHaveTextContent('Enter');
    await user.keyboard('{Enter}');
    expect(onSearchTexts).toHaveBeenCalledWith('yogena cittavṛtti');
  });

  it('submits an option picked with the arrow keys instead of the default', async () => {
    const { user, input, onLookupWord, onSearchTexts } = setup();
    await user.type(input, 'samkhya');
    expect(await option(/^sāṃkhya/)).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onLookupWord).toHaveBeenCalledWith('saṃkhyā');
    expect(onSearchTexts).not.toHaveBeenCalled();
  });

  it('offers a free dictionary lookup for words outside the headword list', async () => {
    const { user, input, onLookupWord } = setup();
    await user.type(input, 'yogena');
    await user.click(await option('Look up “yogena” in the dictionaries'));
    expect(onLookupWord).toHaveBeenCalledWith('yogena');
  });

  it('opens below the input unless little space is left there', async () => {
    const placement = async () =>
      (await screen.findByRole('listbox'))
        .closest('[data-position]')
        ?.getAttribute('data-position');

    const first = setup();
    await first.user.type(first.input, 'yoga');
    await waitFor(async () => expect(await placement()).toBe('bottom'));
    cleanup();

    const second = setup();
    vi.spyOn(second.input, 'getBoundingClientRect').mockReturnValue({
      bottom: window.innerHeight - 100,
    } as DOMRect);
    await second.user.type(second.input, 'yoga');
    await waitFor(async () => expect(await placement()).toBe('top'));
  });

  it('retries with s for sh when no headword matches', async () => {
    const { user, input } = setup();
    await user.type(input, 'shiva');
    expect(await option(/^śiva/)).toBeInTheDocument();
  });
});
