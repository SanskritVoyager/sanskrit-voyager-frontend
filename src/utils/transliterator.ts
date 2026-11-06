// vidyut-lipi compiled to WebAssembly (wasm/transliteration), fetched the first
// time a non-IAST scheme is shown. The module's interface is documented in
// wasm/transliteration/README.md; rebuild pkg/ with `npm run build:wasm`.
import wasmUrl from '../../wasm/transliteration/pkg/sanskrit_voyager_transliteration.wasm?url';
import type { TransliterationScheme } from './transliterationSchemes';

export type Transliterator = {
  /** `text` converted between two schemes, or unchanged for a scheme vidyut lacks (Kolkata) */
  transliterate: (text: string, from: TransliterationScheme, to: TransliterationScheme) => string;
};

type Exports = {
  memory: WebAssembly.Memory;
  vl_alloc: (len: number) => number;
  vl_free: (ptr: number, len: number) => void;
  vl_scheme_id: (ptr: number, len: number) => number;
  vl_transliterate: (ptr: number, len: number, from: number, to: number) => number;
  vl_output_ptr: () => number;
};

/** Instantiates the module from its bytes */
export const instantiateTransliterator = async (bytes: BufferSource): Promise<Transliterator> => {
  const module = await WebAssembly.compile(bytes);
  // vidyut-lipi also exports its own wasm-bindgen functions, which import
  // wasm-bindgen placeholders. They are never called, but instantiation
  // needs every import present.
  const imports: WebAssembly.Imports = {};
  for (const { module: name, name: field } of WebAssembly.Module.imports(module)) {
    imports[name] ??= {};
    imports[name][field] = () => {
      throw new Error(`transliterator: unexpected call to ${name}.${field}`);
    };
  }
  const instance = await WebAssembly.instantiate(module, imports);
  const wasm = instance.exports as unknown as Exports;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  // Views are made after each call into the module: an allocation can grow
  // its memory, which detaches older views
  const withInput = <T>(text: string, use: (ptr: number, len: number) => T): T => {
    const bytesIn = encoder.encode(text);
    const ptr = wasm.vl_alloc(bytesIn.length);
    new Uint8Array(wasm.memory.buffer, ptr, bytesIn.length).set(bytesIn);
    try {
      return use(ptr, bytesIn.length);
    } finally {
      wasm.vl_free(ptr, bytesIn.length);
    }
  };

  const ids = new Map<string, number>();
  const schemeId = (scheme: TransliterationScheme) => {
    let id = ids.get(scheme);
    if (id === undefined) {
      id = withInput(scheme, (ptr, len) => wasm.vl_scheme_id(ptr, len));
      ids.set(scheme, id);
    }
    return id;
  };

  return {
    transliterate: (text, from, to) => {
      const fromId = schemeId(from);
      const toId = schemeId(to);
      if (!text || fromId < 0 || toId < 0) return text;
      const length = withInput(text, (ptr, len) => wasm.vl_transliterate(ptr, len, fromId, toId));
      if (length < 0) return text;
      return decoder.decode(new Uint8Array(wasm.memory.buffer, wasm.vl_output_ptr(), length));
    },
  };
};

let loading: Promise<Transliterator> | null = null;

/** The shared transliterator, fetched and instantiated on the first call */
export const loadTransliterator = (): Promise<Transliterator> => {
  loading ??= fetch(wasmUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`transliterator: ${response.status} for ${wasmUrl}`);
      return response.arrayBuffer();
    })
    .then(instantiateTransliterator)
    .catch((error) => {
      loading = null; // let a later scheme switch retry
      throw error;
    });
  return loading;
};
