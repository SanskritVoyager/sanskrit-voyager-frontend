import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMultidictData, fetchWordData } from '../src/utils/Api';

const API = 'https://api.yogasutratrees.com';

let fetchMock: ReturnType<typeof vi.fn>;

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });

const lastRequest = () => {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init: init as RequestInit };
};

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchWordData (/process)', () => {
  it('sends the scheme in the query string and keeps the text/plain body', async () => {
    respond(200, [['rama']]);
    await expect(fetchWordData('Rama', 'IAST')).resolves.toEqual([['rama']]);

    const { url, init } = lastRequest();
    expect(url).toBe(`${API}/process?input_scheme=IAST`);
    expect(init.method).toBe('POST');
    // text/plain keeps the request CORS-simple: no preflight per click
    expect(init.headers).toEqual({ 'Content-Type': 'text/plain' });
    expect(init.body).toBe('Rama');
  });

  it('sends no scheme when none is known, leaving auto-detection', async () => {
    respond(200, []);
    await fetchWordData('dharma');
    expect(lastRequest().url).toBe(`${API}/process`);
  });

  it('returns [] when the backend rejects the request', async () => {
    respond(400, { error: "Unknown transliteration scheme: 'NOPE'" });
    await expect(fetchWordData('dharma', 'IAST')).resolves.toEqual([]);
  });
});

describe('fetchMultidictData (/process_new)', () => {
  it('sends the scheme as input_scheme in the JSON body', async () => {
    respond(200, [['dharma']]);
    await fetchMultidictData('Darma', ['mw', 'ap90'], 'SLP1');

    const { url, init } = lastRequest();
    expect(url).toBe(`${API}/process_new`);
    expect(JSON.parse(init.body as string)).toEqual({
      text: 'Darma',
      dictionary_names: ['mw', 'ap90'],
      input_scheme: 'SLP1',
    });
  });

  it('omits input_scheme when none is known, leaving auto-detection', async () => {
    respond(200, []);
    await fetchMultidictData('dharma', []);
    expect(JSON.parse(lastRequest().init.body as string)).toEqual({
      text: 'dharma',
      dictionary_names: [],
    });
  });

  it('returns [] when the backend rejects the request', async () => {
    respond(400, { error: "Unknown transliteration scheme: 'NOPE'" });
    await expect(fetchMultidictData('dharma', [], 'IAST')).resolves.toEqual([]);
  });
});
