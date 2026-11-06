import { instantiateTransliterator, Transliterator } from '../src/utils/transliterator';
import { readTransliteratorWasm } from './transliteratorWasm';

let loaded: Promise<Transliterator> | null = null;

/** A transliterator from the committed build, shared by a test file's cases */
export const loadTestTransliterator = (): Promise<Transliterator> => {
  loaded ??= instantiateTransliterator(readTransliteratorWasm());
  return loaded;
};
