// textUtils.ts
export const safeSplitTextOld = (text: string): string[] => {
  // Try the modern approach first
  try {
    // Original regex with lookbehind
    return text.split(/(?<!\|)\|(?!\|)/);
  } catch (e) {
    // Fallback approach for browsers without lookbehind support
    const segments: string[] = [];
    let currentSegment = '';

    // Iterate through the text character by character
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '|') {
        // Check if it's part of '||'
        if (text[i - 1] === '|' || text[i + 1] === '|') {
          currentSegment += '|';
        } else {
          // It's a single pipe, split here
          segments.push(currentSegment);
          currentSegment = '';
        }
      } else {
        currentSegment += text[i];
      }
    }

    // Don't forget the last segment
    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  }
};

export const safeSplitText = (text: string): string[] => {
  // Split only at newline characters
  // The trim() calls ensure we don't get empty whitespace at the start/end of lines
  return text.split(/\r?\n/);
};

/**
 * Normalise the raw text of an original-language element before rendering:
 * - `Name_1,1.1` verse references (GRETIL/DCS style) keep only the number
 * - `/` and `//` separators become `|` and `||`
 * - a period not followed by a digit is treated as a danda
 * - asterisks are stripped and runs of three or more pipes collapse to `||`
 */
export const normalizeOriginalText = (text: string): string =>
  text
    .replace(/([A-Za-z]+)_(\d+(?:[.,]\d+)*[a-z]?)/g, '$2')
    .replace(/\//g, '|')
    .replace(/\.(?!\d)/g, '|')
    .replace(/\*/g, '')
    .replace(/\|{3,}/g, '||');

/** Render ASCII separators as Devanagari dandas. */
export const toDandas = (text: string): string => text.replace(/\|\|/g, '॥').replace(/\|/g, '।');

export const isDandaToken = (token: string): boolean => token === '|' || token === '||';

/** A bare verse or section number such as `1,1.1`, `5` or `2.5.14a`. */
export const isVerseRefToken = (token: string): boolean => /^\d+(?:[.,]\d+)*[a-z]?$/.test(token);
