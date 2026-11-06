//! Transliteration for the Sanskrit Voyager frontend, compiled to WebAssembly.
//!
//! A thin layer over the vendored, patched `vidyut-lipi` (see README.md). It
//! keeps one `Lipika` alive so its mapping cache survives between calls, and
//! exposes plain C-ABI exports, so the module loads without wasm-bindgen glue.
//!
//! Calling convention from JavaScript:
//!
//! 1. Resolve each scheme name once with `vl_scheme_id`.
//! 2. Per string: `vl_alloc` an input buffer, write UTF-8 into it, call
//!    `vl_transliterate`, then `vl_free` the buffer.
//! 3. Read the returned number of bytes from `vl_output_ptr()`. The output
//!    stays valid until the next `vl_transliterate` call.

use std::cell::RefCell;

use vidyut_lipi::{Lipika, Scheme};

/// Returned by `vl_scheme_id` and `vl_transliterate` for an unknown scheme.
pub const ERR_UNKNOWN_SCHEME: i32 = -1;
/// Returned by `vl_scheme_id` and `vl_transliterate` for input that is not UTF-8.
pub const ERR_INVALID_UTF8: i32 = -2;

thread_local! {
    static LIPIKA: RefCell<Lipika> = RefCell::new(Lipika::new());
    static OUTPUT: RefCell<String> = const { RefCell::new(String::new()) };
}

/// Resolves a scheme name, ignoring case.
///
/// Accepts vidyut's own names (`Iast`, `Devanagari`, `HarvardKyoto`, `Slp1`,
/// `Wx`, `Itrans`, `Tamil`...) and `HK`. The reader's `Kolkata` option has no
/// vidyut equivalent and resolves to `None`.
pub fn scheme_from_name(name: &str) -> Option<Scheme> {
    if name.eq_ignore_ascii_case("hk") {
        return Some(Scheme::HarvardKyoto);
    }
    Scheme::iter()
        .copied()
        .find(|scheme| scheme.as_str().eq_ignore_ascii_case(name))
}

/// Transliterates `input` with the shared `Lipika`.
pub fn transliterate(input: &str, from: Scheme, to: Scheme) -> String {
    LIPIKA.with(|lipika| lipika.borrow_mut().transliterate(input, from, to))
}

/// The id of a scheme is its position in `Scheme::iter()`. JavaScript only
/// ever gets ids from `vl_scheme_id`, so the order never leaks into callers.
fn scheme_id(scheme: Scheme) -> i32 {
    Scheme::iter()
        .position(|candidate| *candidate == scheme)
        .and_then(|position| i32::try_from(position).ok())
        .unwrap_or(ERR_UNKNOWN_SCHEME)
}

fn scheme_from_id(id: u32) -> Option<Scheme> {
    Scheme::iter().nth(id as usize).copied()
}

/// # Safety
/// `ptr` must point to `len` readable bytes.
unsafe fn str_from_raw<'a>(ptr: *const u8, len: usize) -> Option<&'a str> {
    if len == 0 {
        return Some("");
    }
    std::str::from_utf8(std::slice::from_raw_parts(ptr, len)).ok()
}

/// Allocates `len` bytes for an input string.
#[no_mangle]
pub extern "C" fn vl_alloc(len: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(len);
    let ptr = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    ptr
}

/// Frees a buffer from `vl_alloc`.
///
/// # Safety
/// `ptr` and `len` must come from one `vl_alloc` call, freed only once.
#[no_mangle]
pub unsafe extern "C" fn vl_free(ptr: *mut u8, len: usize) {
    drop(Vec::from_raw_parts(ptr, 0, len));
}

/// Resolves the UTF-8 scheme name at (`ptr`, `len`) to an id, or returns
/// `ERR_UNKNOWN_SCHEME` / `ERR_INVALID_UTF8`.
///
/// # Safety
/// `ptr` must point to `len` readable bytes.
#[no_mangle]
pub unsafe extern "C" fn vl_scheme_id(ptr: *const u8, len: usize) -> i32 {
    match str_from_raw(ptr, len) {
        None => ERR_INVALID_UTF8,
        Some(name) => scheme_from_name(name).map_or(ERR_UNKNOWN_SCHEME, scheme_id),
    }
}

/// Transliterates the UTF-8 text at (`ptr`, `len`) and returns the output
/// length in bytes, or `ERR_UNKNOWN_SCHEME` / `ERR_INVALID_UTF8`.
///
/// # Safety
/// `ptr` must point to `len` readable bytes.
#[no_mangle]
pub unsafe extern "C" fn vl_transliterate(ptr: *const u8, len: usize, from: u32, to: u32) -> i32 {
    let (Some(from), Some(to)) = (scheme_from_id(from), scheme_from_id(to)) else {
        return ERR_UNKNOWN_SCHEME;
    };
    let Some(input) = str_from_raw(ptr, len) else {
        return ERR_INVALID_UTF8;
    };
    let output = transliterate(input, from, to);
    let output_len = i32::try_from(output.len()).unwrap_or(i32::MAX);
    OUTPUT.with(|slot| *slot.borrow_mut() = output);
    output_len
}

/// Start of the output of the last `vl_transliterate` call.
#[no_mangle]
pub extern "C" fn vl_output_ptr() -> *const u8 {
    OUTPUT.with(|slot| slot.borrow().as_ptr())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Runs one string through the C ABI exactly as JavaScript does.
    fn via_abi(input: &str, from: &str, to: &str) -> Result<String, i32> {
        unsafe {
            let from_id = vl_scheme_id(from.as_ptr(), from.len());
            let to_id = vl_scheme_id(to.as_ptr(), to.len());
            if from_id < 0 || to_id < 0 {
                return Err(from_id.min(to_id));
            }
            let buffer = vl_alloc(input.len());
            std::ptr::copy_nonoverlapping(input.as_ptr(), buffer, input.len());
            let n = vl_transliterate(buffer, input.len(), from_id as u32, to_id as u32);
            vl_free(buffer, input.len());
            if n < 0 {
                return Err(n);
            }
            let bytes = std::slice::from_raw_parts(vl_output_ptr(), n as usize);
            Ok(String::from_utf8(bytes.to_vec()).expect("output is UTF-8"))
        }
    }

    #[test]
    fn resolves_the_reader_scheme_names() {
        let expected = [
            ("IAST", Scheme::Iast),
            ("DEVANAGARI", Scheme::Devanagari),
            ("HK", Scheme::HarvardKyoto),
            ("SLP1", Scheme::Slp1),
            ("Tamil", Scheme::Tamil),
            ("Bengali", Scheme::Bengali),
            ("Kannada", Scheme::Kannada),
            ("WX", Scheme::Wx),
            ("ITRANS", Scheme::Itrans),
        ];
        for (name, scheme) in expected {
            assert_eq!(scheme_from_name(name), Some(scheme), "{name}");
        }
    }

    #[test]
    fn rejects_unknown_scheme_names() {
        assert_eq!(scheme_from_name("Kolkata"), None);
        assert_eq!(scheme_from_name("nope"), None);
        assert_eq!(via_abi("rāma", "IAST", "nope"), Err(ERR_UNKNOWN_SCHEME));
    }

    #[test]
    fn transliterates_through_the_abi() {
        let cases = [
            ("kṛṣṇa", "DEVANAGARI", "कृष्ण"),
            ("saṃskṛtam", "DEVANAGARI", "संस्कृतम्"),
            ("so 'ham", "DEVANAGARI", "सो ऽहम्"),
            ("dharma", "SLP1", "Darma"),
            ("kṛṣṇa", "HK", "kRSNa"),
            ("", "DEVANAGARI", ""),
        ];
        for (input, to, expected) in cases {
            assert_eq!(
                via_abi(input, "IAST", to).as_deref(),
                Ok(expected),
                "{input} -> {to}"
            );
        }
    }

    #[test]
    fn rejects_invalid_utf8_and_ids() {
        let bad = [0xff_u8, 0xfe];
        unsafe {
            assert_eq!(vl_scheme_id(bad.as_ptr(), bad.len()), ERR_INVALID_UTF8);
            assert_eq!(
                vl_transliterate(bad.as_ptr(), bad.len(), 0, 0),
                ERR_INVALID_UTF8
            );
            assert_eq!(
                vl_transliterate(bad.as_ptr(), 0, u32::MAX, 0),
                ERR_UNKNOWN_SCHEME
            );
        }
    }
}
