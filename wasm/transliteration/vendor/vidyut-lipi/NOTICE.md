# vidyut-lipi (vendored)

- **Source:** the `vidyut-lipi` 0.2.0 package from crates.io, unpacked as published.
- **Author:** Arun Prasad <ambuda.library@gmail.com>, from <https://github.com/ambuda-org/vidyut>.
- **License:** MIT, as declared in this crate's `Cargo.toml`. Neither the
  published package nor the upstream repository ships a separate license file.

## Local modification

`src/unicode_norm.rs` builds its normalization tables once instead of on every
call. Nothing else differs from the published package. The change is recorded
as a standalone diff in
`../../patches/vidyut-lipi-0.2.0-cache-normalization-tables.patch`, and the
reason is explained in `../../README.md`.

This NOTICE.md is the only added file.
