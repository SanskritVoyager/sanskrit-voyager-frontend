// utils/wordInfoStyles.ts

/**
 * Calculate styles for the WordInfo panel based on application state
 */

export interface WordInfoStyleParams {
  isTextOrBookPresent: boolean;
  isWordInfoVisible: boolean;
  isMobile: boolean | undefined;
  isTablet: boolean | undefined;
  isNavbarVisible: boolean;
  vhActual: string;
  vhActualHalf: string;
}

/**
 * Calculate the appropriate Grid column span based on current state
 */
export const calculateGridSpan = ({
  isTextOrBookPresent,
  isWordInfoVisible,
  isMobile,
  isTablet,
  isNavbarVisible,
}: WordInfoStyleParams): number => {
  if (!isTextOrBookPresent) {
    return 12; // Full width when no text or book
  }

  if (!isWordInfoVisible) {
    return 0; // Hidden when not visible
  }

  if (isMobile) {
    return 12; // Full width on mobile
  }

  if (isTablet && isNavbarVisible) {
    return 12; // Full width on tablet with navbar
  }

  return 6; // Half width in all other cases
};

/**
 * Calculate the appropriate height based on current state
 */
export const calculateHeight = ({
  isTextOrBookPresent,
  isWordInfoVisible,
  isMobile,
  isTablet,
  isNavbarVisible,
  vhActual,
  vhActualHalf,
}: WordInfoStyleParams): string => {
  if (!isTextOrBookPresent) {
    return vhActual; // Full height when no text or book
  }

  if (!isWordInfoVisible) {
    return '0px'; // No height when not visible
  }

  if (isMobile) {
    return vhActualHalf; // Half height on mobile
  }

  if (isTablet && isNavbarVisible) {
    return vhActualHalf; // Half height on tablet with navbar
  }

  return vhActual; // Full height in all other cases
};

/**
 * Calculate the appropriate width based on current state
 */
export const calculateWidth = ({
  isTextOrBookPresent,
  isWordInfoVisible,
  isMobile,
  isTablet,
  isNavbarVisible,
}: WordInfoStyleParams): string => {
  if (!isTextOrBookPresent) {
    return '100%'; // Full width when no text or book
  }

  if (!isWordInfoVisible) {
    return '0'; // No width when not visible
  }

  if (isMobile) {
    return '100%'; // Full width on mobile
  }

  if (isTablet && isNavbarVisible) {
    return '100%'; // Full width on tablet with navbar
  }

  return '50%'; // Half width in all other cases
};

/**
 * Calculate left padding based on current state
 */
export const calculateLeftPadding = ({
  isTextOrBookPresent,
  isWordInfoVisible,
  isMobile,
  isTablet,
  isNavbarVisible,
}: WordInfoStyleParams): string => {
  if (!isTextOrBookPresent) {
    // Full view padding
    return isMobile
      ? '4%'
      : isTablet
        ? isNavbarVisible
          ? '12%'
          : '22%'
        : isNavbarVisible
          ? '25%'
          : '28%';
  }

  if (!isWordInfoVisible) {
    return '0';
  }

  // Half view padding
  return isMobile
    ? '4%'
    : isTablet
      ? isNavbarVisible
        ? '10%'
        : '3%'
      : isNavbarVisible
        ? '3%'
        : '3%';
};

/**
 * Calculate right padding based on current state
 */
export const calculateRightPadding = ({
  isTextOrBookPresent,
  isWordInfoVisible,
  isMobile,
  isTablet,
  isNavbarVisible,
}: WordInfoStyleParams): string => {
  if (!isTextOrBookPresent) {
    // Full view padding
    return isMobile
      ? '4%'
      : isTablet
        ? isNavbarVisible
          ? '12%'
          : '22%'
        : isNavbarVisible
          ? '25%'
          : '28%';
  }

  if (!isWordInfoVisible) {
    return '0';
  }

  // Half view padding
  return isMobile
    ? '4%'
    : isTablet
      ? isNavbarVisible
        ? '10%'
        : '12%'
      : isNavbarVisible
        ? '10%'
        : '18%';
};
