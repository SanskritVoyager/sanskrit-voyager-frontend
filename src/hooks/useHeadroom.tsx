import { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';

// UseLayoutEffect will show warning if used during ssr, e.g. with Next.js
export const useIsomorphicEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export const isFixed = (current: number, fixedAt: number) => current <= fixedAt;

export const managePinStateAndCallbacks = (
  currentScrollY: number,
  fixedAt: number,
  isCurrentlyPinnedRef: React.MutableRefObject<boolean>,
  isScrollingUp: boolean,
  onPin?: () => void,
  onRelease?: () => void
) => {
  const isInFixedPosition = isFixed(currentScrollY, fixedAt);

  if (isInFixedPosition) {
    if (!isCurrentlyPinnedRef.current) {
      isCurrentlyPinnedRef.current = true;
      onPin?.();
    }
  } else {
    // Not in fixed position
    if (isScrollingUp) {
      if (!isCurrentlyPinnedRef.current) {
        isCurrentlyPinnedRef.current = true;
        onPin?.();
      }
    } else {
      // Scrolling down
      if (isCurrentlyPinnedRef.current) {
        isCurrentlyPinnedRef.current = false;
        onRelease?.();
      }
    }
  }
};

interface ScrollPosition {
  x: number;
  y: number;
}

interface CombinedScrollData {
  position: ScrollPosition;
  isScrollingUp: boolean;
  isReady: boolean;
}

function useCombinedScrollData(
  containerRef: React.RefObject<HTMLElement>,
  scrollThreshold: number = 5
): CombinedScrollData {
  const [position, setPosition] = useState<ScrollPosition>({ x: 0, y: 0 });
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const lastScrollTopRef = useRef(0);
  const resizeTimerRef = useRef<NodeJS.Timeout>();
  const isScrollingUpRef = useRef(true);
  const rafRef = useRef<number>();

  useEffect(() => {
    const element = containerRef.current;

    // Basic DOM safety check
    if (!element || !document.contains(element)) {
      setPosition({ x: 0, y: 0 });
      setIsScrollingUp(true);
      setIsReady(false);
      lastScrollTopRef.current = 0;
      isScrollingUpRef.current = true;
      return;
    }

    setIsReady(true);

    const handleScroll = () => {
      if (isResizing) return;

      // Use RAF to throttle scroll updates for better performance
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = undefined;

        const currentScrollTop = element.scrollTop;
        const currentScrollLeft = element.scrollLeft;

        setPosition({ x: currentScrollLeft, y: currentScrollTop });

        // Calculate scroll direction with threshold
        if (Math.abs(currentScrollTop - lastScrollTopRef.current) > scrollThreshold) {
          const newIsScrollingUp = currentScrollTop < lastScrollTopRef.current;

          // Only update state if direction actually changed
          if (newIsScrollingUp !== isScrollingUpRef.current) {
            isScrollingUpRef.current = newIsScrollingUp;
            setIsScrollingUp(newIsScrollingUp);
          }
        }

        // Special case: if at the very top, always consider it as "scrolling up"
        if (currentScrollTop === 0 && !isScrollingUpRef.current) {
          isScrollingUpRef.current = true;
          setIsScrollingUp(true);
        }

        lastScrollTopRef.current = Math.max(0, currentScrollTop);
      });
    };

    const handleResize = () => {
      setIsResizing(true);
      // Remember current position before resize
      const preResizeScrollTop = lastScrollTopRef.current;

      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        setIsResizing(false);

        // After resize, check if scroll position changed significantly
        const postResizeScrollTop = element.scrollTop;
        if (Math.abs(postResizeScrollTop - preResizeScrollTop) > scrollThreshold) {
          const newIsScrollingUp = postResizeScrollTop < preResizeScrollTop;
          if (newIsScrollingUp !== isScrollingUpRef.current) {
            isScrollingUpRef.current = newIsScrollingUp;
            setIsScrollingUp(newIsScrollingUp);
          }
        }

        lastScrollTopRef.current = Math.max(0, postResizeScrollTop);
      }, 300);
    };

    // Initialize state
    const initialScrollTop = element.scrollTop;
    const initialScrollLeft = element.scrollLeft;

    setPosition({ x: initialScrollLeft, y: initialScrollTop });
    lastScrollTopRef.current = Math.max(0, initialScrollTop);

    // Start with "scrolling up" if at top, otherwise maintain current state
    const initialIsScrollingUp = initialScrollTop === 0 ? true : isScrollingUpRef.current;
    if (initialIsScrollingUp !== isScrollingUpRef.current) {
      isScrollingUpRef.current = initialIsScrollingUp;
      setIsScrollingUp(initialIsScrollingUp);
    }

    element.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimerRef.current);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [containerRef.current, scrollThreshold, isResizing]);

  return { position, isScrollingUp, isReady };
}

interface UseContainerHeadroomInput {
  containerRef: React.RefObject<HTMLElement>;
  fixedAt?: number;
  scrollThreshold?: number;
  onPin?: () => void;
  onFix?: () => void;
  onRelease?: () => void;
}

export function useContainerHeadroom({
  containerRef,
  fixedAt = 0,
  scrollThreshold = 5,
  onPin,
  onFix,
  onRelease,
}: UseContainerHeadroomInput): boolean {
  const isCurrentlyPinnedStateRef = useRef(false);
  const { position, isScrollingUp, isReady } = useCombinedScrollData(containerRef, scrollThreshold);
  const scrollY = position.y;

  // Store callbacks in refs to prevent unnecessary effect re-runs
  const onPinRef = useRef(onPin);
  const onFixRef = useRef(onFix);
  const onReleaseRef = useRef(onRelease);

  useEffect(() => {
    onPinRef.current = onPin;
    onFixRef.current = onFix;
    onReleaseRef.current = onRelease;
  }, [onPin, onFix, onRelease]);

  // Manage pin state and callbacks - only when ready
  useIsomorphicEffect(() => {
    if (!isReady) return;

    managePinStateAndCallbacks(
      scrollY,
      fixedAt,
      isCurrentlyPinnedStateRef,
      isScrollingUp,
      onPinRef.current,
      onReleaseRef.current
    );
  }, [scrollY, fixedAt, isScrollingUp, isReady]);

  // Handle fix callback - only when ready
  useIsomorphicEffect(() => {
    if (!isReady) return;

    if (isFixed(scrollY, fixedAt)) {
      onFixRef.current?.();
      // Ensure pinned state is consistent when fixed
      if (!isCurrentlyPinnedStateRef.current) {
        isCurrentlyPinnedStateRef.current = true;
        onPinRef.current?.();
      }
    }
  }, [scrollY, fixedAt, isReady]);

  // Return visible state - default to visible when not ready (safer for mobile)
  if (!isReady) return true;

  return isFixed(scrollY, fixedAt) || isScrollingUp;
}

// Separate scroll utility
export function useContainerScrollTo(containerRef: React.RefObject<HTMLElement>) {
  return useCallback(
    ({ x, y }: Partial<ScrollPosition>) => {
      if (!containerRef.current) return;

      const scrollOptions: ScrollToOptions = { behavior: 'smooth' };
      if (typeof x === 'number') scrollOptions.left = x;
      if (typeof y === 'number') scrollOptions.top = y;

      containerRef.current.scrollTo(scrollOptions);
    },
    [containerRef]
  );
}
