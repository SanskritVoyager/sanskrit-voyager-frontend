import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// From the project root, where the tests run: Vite rewrites new URL(…, import.meta.url)
// into a server URL, which readFileSync cannot open
const WASM = resolve(
  process.cwd(),
  'wasm/transliteration/pkg/sanskrit_voyager_transliteration.wasm'
);

/**
 * The committed WebAssembly build, read from disk: jsdom cannot fetch it. This
 * file imports nothing from src, so a vi.mock factory of src/utils/transliterator
 * can use it without importing the module it is replacing.
 */
export const readTransliteratorWasm = () => readFileSync(WASM);
