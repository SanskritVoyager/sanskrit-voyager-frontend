import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SCHEME_STORAGE_KEY,
  useTransliterationScheme,
} from '../src/hooks/useTransliterationScheme';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

/** Every scheme the hook returned, render by render */
const renderScheme = () => {
  const seen: string[] = [];
  const hook = renderHook(() => {
    const result = useTransliterationScheme();
    seen.push(result[0]);
    return result;
  });
  return { ...hook, seen };
};

describe('useTransliterationScheme', () => {
  it('starts with IAST when nothing is saved', () => {
    expect(renderScheme().result.current[0]).toBe('IAST');
  });

  it('starts with the saved scheme on the very first render', () => {
    window.localStorage.setItem(SCHEME_STORAGE_KEY, 'DEVANAGARI');
    const { seen } = renderScheme();
    // No IAST first: the saved scheme is read before the first render
    expect(seen[0]).toBe('DEVANAGARI');
  });

  it('saves a new pick, so the next page load starts with it', () => {
    const { result } = renderScheme();
    act(() => result.current[1]('HK'));
    expect(result.current[0]).toBe('HK');
    expect(window.localStorage.getItem(SCHEME_STORAGE_KEY)).toBe('HK');
    expect(renderScheme().result.current[0]).toBe('HK');
  });

  it('reads a saved scheme in any case, and falls back to IAST for anything else', () => {
    window.localStorage.setItem(SCHEME_STORAGE_KEY, 'tamil');
    expect(renderScheme().result.current[0]).toBe('Tamil');
    window.localStorage.setItem(SCHEME_STORAGE_KEY, 'velthuis');
    expect(renderScheme().result.current[0]).toBe('IAST');
  });

  it('still works when the browser blocks storage', () => {
    const blocked = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    const { result } = renderScheme();
    expect(result.current[0]).toBe('IAST');
    act(() => result.current[1]('SLP1'));
    expect(result.current[0]).toBe('SLP1');
  });
});
