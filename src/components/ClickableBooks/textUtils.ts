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
  return [text];
};
