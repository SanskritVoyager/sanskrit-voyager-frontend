// localStorageColorSchemeManager.ts
import { isMantineColorScheme, MantineColorScheme, MantineColorSchemeManager } from '@mantine/core';

export interface LocalStorageColorSchemeManagerOptions {
  key?: string;
  defaultScheme?: MantineColorScheme;
}
export function localStorageColorSchemeManager({
  key = 'mantine-color-scheme',
  defaultScheme = 'light',
}: LocalStorageColorSchemeManagerOptions = {}): MantineColorSchemeManager {
  let storageHandler: ((event: StorageEvent) => void) | null = null;
  let mediaQueryHandler: ((event: MediaQueryListEvent) => void) | null = null;
  let mediaQuery: MediaQueryList | null = null;

  // Add a reference to store timeout ID for debouncing
  let debounceTimeout: number | null = null;

  return {
    get: (defaultValue) => {
      if (typeof window === 'undefined') {
        return defaultValue;
      }

      try {
        // Read from localStorage once on initial load
        const stored = window.localStorage.getItem(key);
        if (stored && isMantineColorScheme(stored)) {
          return stored;
        }

        // Set system preference as default
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

        // Store for future use but don't trigger reflows
        try {
          window.localStorage.setItem(key, systemPreference);
        } catch {
          // Ignore errors in private browsing
        }

        return systemPreference;
      } catch {
        return defaultValue;
      }
    },

    set: (colorScheme) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(key, colorScheme);
      } catch {
        // Ignore errors in private browsing
      }
    },

    clear: () => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore errors in private browsing
      }
    },

    // Rest of the implementation with proper cleanup
    subscribe: (onUpdate) => {
      if (typeof window === 'undefined') return;

      storageHandler = (event) => {
        if (
          event.storageArea === window.localStorage &&
          event.key === key &&
          isMantineColorScheme(event.newValue)
        ) {
          onUpdate(event.newValue);
        }
      };

      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQueryHandler = (e) => {
        // Debounce theme changes to prevent flickering
        if (debounceTimeout) {
          window.clearTimeout(debounceTimeout);
        }

        debounceTimeout = window.setTimeout(() => {
          if (!window.localStorage.getItem(key)) {
            const newScheme = e.matches ? 'dark' : 'light';
            onUpdate(newScheme);
          }
        }, 50); // Short debounce time
      };

      window.addEventListener('storage', storageHandler);
      mediaQuery.addEventListener('change', mediaQueryHandler);
    },

    unsubscribe: () => {
      if (typeof window === 'undefined') return;

      if (storageHandler) {
        window.removeEventListener('storage', storageHandler);
        storageHandler = null;
      }

      if (mediaQuery && mediaQueryHandler) {
        mediaQuery.removeEventListener('change', mediaQueryHandler);
        mediaQueryHandler = null;
        mediaQuery = null;
      }

      if (debounceTimeout) {
        window.clearTimeout(debounceTimeout);
        debounceTimeout = null;
      }
    },
  };
}
