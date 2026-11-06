# Transliteration (WebAssembly)

Client-side transliteration for the reader and the dictionary panel. It uses
[vidyut-lipi](https://github.com/ambuda-org/vidyut), a Rust transliterator,
compiled to WebAssembly. The dictionary panel uses it today (see
`src/utils/transliterator.ts` and `src/context/TransliterationContext.tsx`);
book text is next, per `docs/transliteration-display-handoff.md`.

The app loads the committed build in `pkg/`, because the Vercel build has no
Rust toolchain. After changing the crate, rebuild it from the frontend root
with `npm run build:wasm` and commit `pkg/`.

## Why the patch

In WASM builds, vidyut-lipi 0.2.0 rebuilds two Unicode-normalization tables,
from every scheme it knows, on **every call** (`to_nfc` and `to_nfd` in
`src/unicode_norm.rs`). Each call therefore costs about 22 µs before any
transliteration happens. The reader converts one word at a time, so that cost
dominates: the Ṛgveda took 10.8 s word by word.

The patch builds both tables once and keeps them in a `OnceLock`. Output is
byte-identical: 282,780 comparisons across four books, every distinct word of
the 99th-percentile book, four target schemes.

| IAST → Devanagari, each distinct word converted once | sanscript.js | vidyut, unpatched | vidyut, patched |
|---|---|---|---|
| 90th-percentile book (199k words, 56k distinct) | 276 ms | 1,333 ms | 133 ms |
| Ṛgveda (489k words, 23k distinct) | 90 ms | 543 ms | 44 ms |

Measured 2026-11-05 on Apple Silicon in Node 26. Upstream main still has the
per-call rebuild; the patch is worth sending to them.

## Layout

| Path | What it is |
|---|---|
| `src/lib.rs` | The wrapper: one shared `Lipika`, C-ABI exports, native unit tests |
| `vendor/vidyut-lipi/` | vidyut-lipi 0.2.0 as published on crates.io, with the patch applied; `NOTICE.md` records the source and license |
| `patches/` | The patch as a standalone diff, for re-applying on upgrade and for upstream |
| `scripts/check-wasm.mjs` | Checks the release `.wasm`: known outputs, and fails if a call costs over 5 µs |
| `pkg/` | The committed build the app imports (`npm run build:wasm` refreshes it) |
| `Cargo.toml` | Pins `vidyut-lipi = "=0.2.0"` and points it at `vendor/` via `[patch.crates-io]` |

## Build and check

Needs Rust with the `wasm32-unknown-unknown` target
(`rustup target add wasm32-unknown-unknown`).

```bash
cd wasm/transliteration
cargo test --locked                                       # wrapper, native
cargo build --release --locked --target wasm32-unknown-unknown
node scripts/check-wasm.mjs                               # the patched code
```

Output: `target/wasm32-unknown-unknown/release/sanskrit_voyager_transliteration.wasm`
(about 270 KB, 80 KB gzipped, 55 KB brotli).

The patched functions are compiled only for `wasm32`; native builds use the
`unicode-normalization` crate instead. So `cargo test` never reaches the patch,
and `check-wasm.mjs` is its regression test. Against the unpatched crate it
fails at about 22 µs per call.

## Interface

Plain exports, no wasm-bindgen glue:

| Export | Purpose |
|---|---|
| `vl_scheme_id(ptr, len) -> i32` | Resolve a UTF-8 scheme name once; `-1` unknown, `-2` invalid UTF-8 |
| `vl_alloc(len) -> ptr` / `vl_free(ptr, len)` | Input buffer for one string |
| `vl_transliterate(ptr, len, from, to) -> i32` | Output length in bytes, or `-1` / `-2` |
| `vl_output_ptr() -> ptr` | Start of that output; valid until the next call |

`check-wasm.mjs` shows the full calling sequence from JavaScript.

vidyut-lipi also exports its own wasm-bindgen functions, which import
wasm-bindgen placeholders. They are never called, but instantiation needs every
import present, so the loader supplies throwing stubs (see `check-wasm.mjs`).

**Scheme names** are matched ignoring case against vidyut's names (`Iast`,
`Devanagari`, `HarvardKyoto`, `Slp1`, `Wx`, `Itrans`, `Tamil`, `Bengali`,
`Kannada`...), plus `HK`. The reader's **Kolkata** option has no vidyut
equivalent and resolves to unknown. The app derives it instead: Kolkata is IAST
with long `e`/`o` marked `ē`/`ō`, which matched sanscript's `kolkata_v2` on all
68,499 distinct words of a large text.

**Input to prepare before calling.** `src/utils/displayWord.ts` does all of this:
- **Case:** vidyut does not read uppercase IAST (`Kṛṣṇa` → `Kऋष्ण`), so lowercase first.
- **`ṁ`:** it becomes the Vedic sign ꣳ rather than ं; map it to `ṃ` for classical texts.
- **Diaeresis:** `ï`/`ü` mark hiatus and are passed through unconverted. Do not
  just strip them: `praüga` would become `prauga`, read as the diphthong `au`
  (`प्रौग`). Convert each side separately: `pra` + `uga` = `प्रउग`.
- **Accents:** Macdonell's acute (`dhár` → `ध्áर्`) and Monier-Williams's `/` `\` `^`
  marks are not read; remove them.
- **Batching:** to convert many words, either call once per distinct word with a
  cache, or join the distinct words with `\n` and convert them in one call.
  Both give the same output.

## Upgrading vidyut-lipi

1. Unpack the new version from crates.io over `vendor/vidyut-lipi/`, keeping
   `NOTICE.md`.
2. Re-apply the patch, unless upstream has fixed it:
   `cd vendor/vidyut-lipi && patch -p1 < ../../patches/vidyut-lipi-0.2.0-cache-normalization-tables.patch`
3. Update the version in `Cargo.toml` and `NOTICE.md`, then run all three
   commands under *Build and check*.
