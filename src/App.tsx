import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
import { localStorageColorSchemeManager } from './utils/localStorageColorSchemeManager';
import { ResponsiveProvider } from './context/ResponsiveContext';

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'mantine-color-scheme',
});

export default function App() {
  return (
    <MantineProvider theme={theme} colorSchemeManager={colorSchemeManager}>
      <ResponsiveProvider>
        <Router />
      </ResponsiveProvider>
    </MantineProvider>
  );
}
