// Monier-Williams headwords (~194k, 4.2 MB) for dictionary autocomplete. The
// header search and the welcome search both use them, so they are fetched and
// parsed once.

let cachedKeys: string[] | null = null;
let inflightKeys: Promise<string[]> | null = null;

export async function loadDictionaryKeys(): Promise<string[]> {
  if (cachedKeys) return cachedKeys;
  if (inflightKeys) return inflightKeys;
  inflightKeys = fetch('/resources/MWKeysOnly.json')
    .then((r) => {
      if (!r.ok) throw new Error('Failed to fetch MWKeysOnly.json');
      return r.json() as Promise<string[]>;
    })
    .then((data) => {
      cachedKeys = data;
      inflightKeys = null;
      return data;
    })
    .catch((err) => {
      inflightKeys = null;
      throw err;
    });
  return inflightKeys;
}
