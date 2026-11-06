import type { TransliterationScheme } from './transliterationSchemes';

/**
 * Looks `word` up in the default dictionary. `inputScheme` is the scheme the
 * word is written in; without it the backend auto-detects.
 */
export async function fetchWordData(word: string, inputScheme?: TransliterationScheme) {
  // console.log('Posting word to API:', word); // Print the word

  // The scheme goes in the query string: a text/plain body keeps this a
  // CORS-simple request, which browsers send without a preflight
  const query = inputScheme ? `?input_scheme=${encodeURIComponent(inputScheme)}` : '';

  try {
    const response = await fetch(`https://api.yogasutratrees.com/process${query}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: word,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

export async function transliterateText(inputText: string, value: string) {
  if (inputText && value) {
    const response = await fetch('https://api.yogasutratrees.com/transliterate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: inputText,
        transliteration_scheme: value,
      }),
    });

    if (!response.ok) {
      console.error('An error occurred while transliterating the text');
      return;
    }

    const processedText = await response.json();
    return processedText;
  }
    console.error('Missing text or transliteration_scheme');
}

export async function handleTranslate(inputText: string) {
  const response = await fetch('https://api.yogasutratrees.com/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: inputText,
    }),
  });

  if (!response.ok) {
    console.error('An error occurred while transliterating the text');
    return;
  }

  const translatedText = await response.json();
  // console.log(translatedText);
  return translatedText;
}

/**
 * Looks `text` up in `dictionary_names`. `inputScheme` is the scheme the text
 * is written in; without it the backend auto-detects.
 */
export async function fetchMultidictData(
  text: string,
  dictionary_names: string[],
  inputScheme?: TransliterationScheme
) {
  // console.log('Posting word to API:', text, 'With dictionary:', dictionary_names);

  try {
    const response = await fetch('https://api.yogasutratrees.com/process_new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // JSON.stringify drops an undefined input_scheme, leaving auto-detection
      body: JSON.stringify({
        text,
        dictionary_names,
        input_scheme: inputScheme,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}
