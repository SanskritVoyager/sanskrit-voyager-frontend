// Strip sa_/ta_ language prefix, NFD-strip diacritics, lowercase.
// Verified zero collisions across all 886 entries in titles.json.
export function toSlug(originalTitle: string): string {
  return originalTitle
    .replace(/^sa_/, '')
    .replace(/^ta_/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function findOriginalBySlug(slug: string, titles: string[]): string | undefined {
  const target = slug.toLowerCase();
  return titles.find((title) => toSlug(title) === target);
}

let cachedTitles: string[] | null = null;
let inflightTitles: Promise<string[]> | null = null;

export async function loadTitles(): Promise<string[]> {
  if (cachedTitles) return cachedTitles;
  if (inflightTitles) return inflightTitles;
  inflightTitles = fetch('/resources/books/titles.json')
    .then((r) => {
      if (!r.ok) throw new Error('Failed to fetch titles.json');
      return r.json() as Promise<string[]>;
    })
    .then((data) => {
      cachedTitles = data;
      inflightTitles = null;
      return data;
    })
    .catch((err) => {
      inflightTitles = null;
      throw err;
    });
  return inflightTitles;
}
