// src/contexts/ResponsiveContext.tsx
import React, { createContext, useContext } from 'react';
import { useMediaQuery } from '@mantine/hooks';

// Define the shape of our context
interface ResponsiveContextType {
  isMobile: boolean;
  isTablet: boolean;
  isSmallMobile: boolean;
}

// Create the context with default values
const ResponsiveContext = createContext<ResponsiveContextType>({
  isMobile: false,
  isTablet: false,
  isSmallMobile: false,
});

// Create a provider component
export function ResponsiveProvider({ children }: { children: React.ReactNode }) {
  // Define your media queries (same values as in HomePage)
  const isMobile = useMediaQuery('(max-width: 660px)') ?? false;
  const isTablet = useMediaQuery('(max-width: 1100px)') ?? false;
  const isSmallMobile = useMediaQuery('(max-height: 724px)') ?? false;

  // Value to be provided to consuming components
  const value = {
    isMobile,
    isTablet,
    isSmallMobile,
  };

  return <ResponsiveContext.Provider value={value}>{children}</ResponsiveContext.Provider>;
}

// Custom hook for easier access to this context
export function useResponsive() {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
}
