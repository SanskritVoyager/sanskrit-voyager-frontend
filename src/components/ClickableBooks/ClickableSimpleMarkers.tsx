import React, { useState, useEffect, useRef } from 'react';
import { useThrottledCallback, useThrottledState } from '@mantine/hooks';
import classes from './ClickableSimpleBooks.module.css';

// Define the interface for component props
interface ScrollMarkersProps {
  /** Reference to the container element that holds the text content */
  containerRef: React.RefObject<HTMLDivElement>;

  /** Map of segment numbers to their DOM element references */
  segmentRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;

  /** Array of segment numbers that should be marked on the scrollbar */
  matchedBookSegments: number[];

  /** The currently active/highlighted segment number, or null if none */

  /** Function to set the new target segment number */

  activeSegment: number | null; // For styling only
  onSegmentClick: (segmentNumber: number) => void; // Direct function call

  initialRenderComplete: boolean;

  /** Whether the application is in mobile view 
  isMobile: boolean;
  
  /** Whether the word information panel is currently visible 
  isWordInfoVisible: boolean; */
}

// Type definition for an individual segment marker
interface SegmentMarker {
  segmentNumber: number;
  positionPercent: number;
}

const ScrollMarkers: React.FC<ScrollMarkersProps> = ({
  containerRef,
  segmentRefs,
  matchedBookSegments,
  activeSegment,
  onSegmentClick,
  initialRenderComplete,
}) => {
  // Using regular state for processed markers since we'll throttle the calculation function
  const [processedMatches, setProcessedMatches] = useState<SegmentMarker[]>([]);

  // Using useThrottledState for container right edge position to avoid frequent updates
  const [containerRightEdge, setContainerRightEdge] = useThrottledState<number>(0, 100);

  // this is correct
  // Calculate container edge position (throttled with Mantine hook)
  const updateRightEdgePosition = useThrottledCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerRightEdge(window.innerWidth - rect.right - 16);
    }
  }, 100);

  // this is correct as well
  // Calculate marker positions (throttled with Mantine hook)
  const calculateMarkerPositions = useThrottledCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const totalHeight = container.scrollHeight;

    const segmentPositions = matchedBookSegments
      .map((segmentNumber) => {
        const element = segmentRefs.current.get(segmentNumber);
        if (!element) return null;

        // Calculate position as percentage of container height
        const positionPercent = (element.offsetTop / (totalHeight - 56)) * 100;

        return {
          segmentNumber,
          positionPercent: Math.max(0, Math.min(100, positionPercent)),
        };
      })
      .filter((pos): pos is SegmentMarker => pos !== null);

    setProcessedMatches(segmentPositions);
  }, 150);

  useEffect(() => {
    // Initial calculation
    updateRightEdgePosition();

    // Create resize observer
    const resizeObserver = new ResizeObserver(() => {
      updateRightEdgePosition();
    });

    // Observe the container
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Add window resize listener
    window.addEventListener('resize', updateRightEdgePosition);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateRightEdgePosition);
    };
  }, [updateRightEdgePosition]);

  useEffect(() => {
    // Only calculate if initial render is complete and we have segments
    if (initialRenderComplete && matchedBookSegments.length > 0) {
      console.log('Calculating markers due to segment change or initial render complete.');
      // Use a small timeout to ensure DOM refs are definitely ready after initialRenderComplete flips true
      const timer = setTimeout(() => {
        calculateMarkerPositions();
      }, 500); // Small delay
      return () => clearTimeout(timer);
    } else if (matchedBookSegments.length === 0) {
      // Clear markers if segments are cleared
      setProcessedMatches([]);
    }
  }, [matchedBookSegments, initialRenderComplete, calculateMarkerPositions]); // Depend on segments and the flag

  // Return null if no matches to display
  if (processedMatches.length === 0) {
    return null;
  }

  return (
    <div
      className={classes.markerContainer}
      style={{
        right: `${containerRightEdge}px`,
        // Adjust height depending on mobile + wordInfo state
        // height: isMobile && isWordInfoVisible ? '50vh' : '100%'
      }}
    >
      {processedMatches.map((segment) => (
        <div
          key={segment.segmentNumber}
          onClick={() => onSegmentClick(segment.segmentNumber)} // Direct function call
          className={`${classes.marker} ${
            segment.segmentNumber === activeSegment ? classes.activeMarker : ''
          }`}
          style={{ top: `${segment.positionPercent}%` }}
          title={`Go to segment ${segment.segmentNumber}`}
        />
      ))}
    </div>
  );
};

export default React.memo(ScrollMarkers);
