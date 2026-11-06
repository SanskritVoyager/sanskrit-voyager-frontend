// Checks the release WebAssembly build: known outputs, plus the per-call cost
// the vidyut-lipi patch fixes. The patched code only compiles for wasm32, so
// `cargo test` cannot reach it; this script is the patch's regression test.
//
//   cargo build --release --target wasm32-unknown-unknown
//   node scripts/check-wasm.mjs
//
// Honors CARGO_TARGET_DIR, like cargo itself.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const crateDir = fileURLToPath(new URL('..', import.meta.url));
const targetDir = process.env.CARGO_TARGET_DIR ?? join(crateDir, 'target');
const wasmPath = join(
  targetDir,
  'wasm32-unknown-unknown/release/sanskrit_voyager_transliteration.wasm'
);

// Unpatched, a call costs ~22 µs on Apple Silicon; patched, ~1.3 µs
const MAX_MICROSECONDS_PER_CALL = 5;
const TIMED_CALLS = 20000;

const module = new WebAssembly.Module(readFileSync(wasmPath));
// vidyut-lipi also exports its own wasm-bindgen functions, which import
// wasm-bindgen's placeholders. This module never calls them, but
// instantiation needs every import present, so each one throws if reached.
const imports = {};
for (const { module: name, name: field } of WebAssembly.Module.imports(module)) {
  imports[name] ??= {};
  imports[name][field] = () => {
    throw new Error(`unexpected call to ${name}.${field}`);
  };
}
const wasm = new WebAssembly.Instance(module, imports).exports;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const withInput = (text, use) => {
  const bytes = encoder.encode(text);
  const ptr = wasm.vl_alloc(bytes.length);
  new Uint8Array(wasm.memory.buffer, ptr, bytes.length).set(bytes);
  try {
    return use(ptr, bytes.length);
  } finally {
    wasm.vl_free(ptr, bytes.length);
  }
};
const schemeId = (name) => withInput(name, (ptr, len) => wasm.vl_scheme_id(ptr, len));
const transliterate = (text, from, to) => {
  const n = withInput(text, (ptr, len) => wasm.vl_transliterate(ptr, len, from, to));
  if (n < 0) throw new Error(`vl_transliterate failed with ${n}`);
  return decoder.decode(new Uint8Array(wasm.memory.buffer, wasm.vl_output_ptr(), n));
};

let failures = 0;
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures += 1;
};

const iast = schemeId('IAST');
const cases = [
  ['kṛṣṇa', 'DEVANAGARI', 'कृष्ण'],
  ['saṃskṛtam', 'DEVANAGARI', 'संस्कृतम्'],
  ["so 'ham", 'DEVANAGARI', 'सो ऽहम्'],
  ['dharma', 'SLP1', 'Darma'],
  ['kṛṣṇa', 'HK', 'kRSNa'],
];
for (const [input, to, expected] of cases) {
  const actual = transliterate(input, iast, schemeId(to));
  check(actual === expected, `${input} -> ${to}: ${actual}`);
}
check(schemeId('Kolkata') === -1, 'Kolkata is reported as unknown');

const devanagari = schemeId('DEVANAGARI');
transliterate('rāma', iast, devanagari);
const start = process.hrtime.bigint();
for (let i = 0; i < TIMED_CALLS; i += 1) transliterate('dharmakṣetre', iast, devanagari);
const perCall = Number(process.hrtime.bigint() - start) / 1e3 / TIMED_CALLS;
check(
  perCall < MAX_MICROSECONDS_PER_CALL,
  `${perCall.toFixed(2)} µs per call (limit ${MAX_MICROSECONDS_PER_CALL}; unpatched is ~22)`
);

process.exitCode = failures ? 1 : 0;
