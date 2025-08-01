// ResizablePanel.tsx
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import styles from './ResizeHandler.module.css';

export interface ResizablePanelProps {
  /** Title displayed at the top of the panel */
  title?: string;
  /** Content to be rendered inside the panel */
  children: React.ReactNode;
  /** Which breakpoint to initialize the panel height with (index into breakpoints array) */
  initialBreakpointIndex?: number;
  /** Array of height values (in pixels) that the panel can snap to */
  breakpoints?: number[];
  /** Callback function called when the panel height changes */
  onResize?: (height: number) => void;
  /** Optional CSS class name to apply to the panel container */
  className?: string;
}

export interface ResizablePanelHandle {
  /** Set the panel height to a specific breakpoint */
  setBreakpoint: (breakpointIndex: number) => void;
  /** Get the current panel height */
  getCurrentHeight: () => number;
  /** Check if the panel is at or near a specific breakpoint */
  isAtBreakpoint: (breakpointIndex: number, tolerance?: number) => boolean;
}

/**
 * A resizable panel component that appears from the bottom of the screen
 * with CSS-based animations and fluid touch/mouse interactions.
 */
const ResizablePanel = forwardRef<ResizablePanelHandle, ResizablePanelProps>((props, ref) => {
  const {
    title = '',
    children,
    initialBreakpointIndex = 1,
    breakpoints = [150, 300, 500, 700, 850],
    onResize = () => {},
    className = '',
  } = props;

  // State for panel height
  const [height, setHeight] = useState<number>(breakpoints[initialBreakpointIndex]);

  // State for managing transitions
  const [hasTransition, setHasTransition] = useState<boolean>(true);
  const transitionDuration = 200; // Fixed transition duration

  // Dragging state and refs
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  // Velocity tracking for inertial scrolling
  const velocityRef = useRef<number>(0);
  const lastClientYRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  // Container ref for direct DOM manipulation when needed
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose imperative methods to parent component
  useImperativeHandle(ref, () => ({
    // Set the panel to a specific breakpoint
    setBreakpoint: (breakpointIndex: number) => {
      const index = Math.max(0, Math.min(breakpointIndex, breakpoints.length - 1));
      setHeightWithTransition(breakpoints[index]);
    },
    // Get the current height
    getCurrentHeight: () => height,
    // Check if the panel is at or near a specific breakpoint
    isAtBreakpoint: (breakpointIndex: number, tolerance = 10) => {
      const targetHeight = breakpoints[breakpointIndex];
      return Math.abs(height - targetHeight) <= tolerance;
    },
  }));

  // Find the next breakpoint in a direction
  const findNextBreakpoint = (currentValue: number, direction: 'up' | 'down'): number => {
    // Sort breakpoints from smallest to largest
    const sortedBreakpoints = [...breakpoints].sort((a, b) => a - b);

    if (direction === 'up') {
      // Find the next larger breakpoint
      const nextLarger = sortedBreakpoints.find((bp) => bp > currentValue);
      return nextLarger || sortedBreakpoints[sortedBreakpoints.length - 1];
    } else {
      // Find the next smaller breakpoint
      const reversedBreakpoints = [...sortedBreakpoints].reverse();
      const nextSmaller = reversedBreakpoints.find((bp) => bp < currentValue);
      return nextSmaller || sortedBreakpoints[0];
    }
  };

  // Find the closest breakpoint for snapping
  const findClosestBreakpoint = (value: number): number => {
    return breakpoints.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
  };

  // Set height with transition
  const setHeightWithTransition = (newHeight: number) => {
    setHasTransition(true);
    setHeight(newHeight);
    onResize(newHeight);
  };

  // Toggle between collapsed and expanded states (for double-tap)
  const toggleExpandCollapse = (): void => {
    const minHeight = Math.min(...breakpoints);
    const viewportHeight = window.innerHeight;
    const maxHeight = Math.min(Math.max(...breakpoints), viewportHeight * 0.8);

    // If we're closer to the max height, collapse to min, otherwise expand to max
    const targetHeight = height > (minHeight + maxHeight) / 2 ? minHeight : maxHeight;

    // Use the standard transition duration
    setHeightWithTransition(targetHeight);
  };

  // Handle start of drag operation
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent): void => {
    // We don't call preventDefault() here to fix the passive listener issue
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Start dragging
    setIsDragging(true);
    startYRef.current = clientY;
    startHeightRef.current = height;

    // Disable transition during dragging
    setHasTransition(false);

    // Initialize velocity tracking
    const now = Date.now();
    lastClientYRef.current = clientY;
    lastTimestampRef.current = now;
    velocityRef.current = 0;
  };

  // Handle drag movement
  const handleDrag = (e: MouseEvent | TouchEvent): void => {
    if (!isDragging) return;

    // We use stopPropagation instead of preventDefault to avoid passive listener issues
    e.stopPropagation();

    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const now = Date.now();

    // Calculate velocity (pixels per millisecond)
    const deltaTime = now - lastTimestampRef.current;
    if (deltaTime > 0) {
      // Negative velocity means panel is growing (dragging up)
      // Positive velocity means panel is shrinking (dragging down)
      const instantVelocity = (clientY - lastClientYRef.current) / deltaTime;

      // Smooth out velocity with some averaging
      velocityRef.current = velocityRef.current * 0.7 + instantVelocity * 0.3;

      lastTimestampRef.current = now;
      lastClientYRef.current = clientY;
    }

    // Calculate new height based on drag position
    const deltaY = startYRef.current - clientY;

    // Apply constraints: min/max breakpoints and viewport limits
    const minHeight = Math.min(...breakpoints);
    const viewportHeight = window.innerHeight;
    const maxViewportHeight = viewportHeight * 0.8; // 80% of viewport height
    const maxHeight = Math.min(Math.max(...breakpoints), maxViewportHeight);

    const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current + deltaY));

    // Update height without transition during drag
    setHeight(newHeight);
    onResize(newHeight);
  };

  // Handle end of dragging
  const handleDragEnd = (): void => {
    if (!isDragging) return;
    setIsDragging(false);

    // Get velocity and determine direction
    const velocity = velocityRef.current;
    const direction = velocity < 0 ? 'up' : 'down';

    // Calculate bounds
    const minHeight = Math.min(...breakpoints);
    const viewportHeight = window.innerHeight;
    const maxViewportHeight = viewportHeight * 0.8;
    const maxHeight = Math.min(Math.max(...breakpoints), maxViewportHeight);

    // Determine if we have a flick gesture (any movement with intent)
    const isFlick = Math.abs(velocity) > 0.1; // Lower threshold to detect lighter flicks

    if (isFlick) {
      // Find the next breakpoint in the flick direction
      const targetHeight = findNextBreakpoint(height, direction);

      // Apply the transition with fixed duration
      setHeightWithTransition(targetHeight);
    } else {
      // No significant movement, just snap to closest breakpoint
      const closestBreakpoint = findClosestBreakpoint(height);
      setHeightWithTransition(closestBreakpoint);
    }
  };

  // Window resize handler to adjust maximum height
  useEffect(() => {
    const handleResize = (): void => {
      const viewportHeight = window.innerHeight;
      const maxViewportHeight = viewportHeight * 0.8; // 80% of viewport height

      // If current height exceeds new max height, reset to max
      if (height > maxViewportHeight) {
        const newHeight = Math.min(height, maxViewportHeight);
        setHeight(newHeight);
        onResize(newHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height, onResize]);

  // Set up and clean up event listeners for dragging
  useEffect(() => {
    // We manually add event listeners with { passive: false } to allow preventDefault()
    const handleMouseMove = (e: MouseEvent): void => handleDrag(e);
    const handleTouchMove = (e: TouchEvent): void => handleDrag(e);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      // Use passive: false for touchmove to prevent scrolling while dragging
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, height]);

  const singleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePanelClick = (e: React.MouseEvent): void => {
    // Don't process when dragging or on right-click
    if (isDragging || e.button !== 0) return;

    // Clear any pending single click
    if (singleClickTimerRef.current) {
      clearTimeout(singleClickTimerRef.current);
      singleClickTimerRef.current = null;
    }

    if (e.detail === 1) {
      // Single click - wait to see if double click is coming
      singleClickTimerRef.current = setTimeout(() => {
        // Single click confirmed - add single click behavior here if needed
        // For now, do nothing on single click
        singleClickTimerRef.current = null;
      }, 200);
    } else if (e.detail === 2) {
      // Double click - execute immediately
      toggleExpandCollapse();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.panelContainer} ${!hasTransition ? styles.noTransition : ''} ${className}`}
      style={{
        height: `${height}px`,
        transitionDuration: `${transitionDuration}ms`,
      }}
      onClick={handlePanelClick}
    >
      {/* Drag handle */}
      <div
        className={`${styles.dragHandle} ${isDragging ? styles.dragHandleGrabbing : ''}`}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className={styles.dragIndicator} />
      </div>

      {/* Title (if provided) */}
      {title && title.trim() !== '' && <div className={styles.panelTitle}>{title}</div>}

      {/* Content area with scrolling */}
      <div className={styles.contentArea}>{children}</div>
    </div>
  );
});

export default ResizablePanel;
