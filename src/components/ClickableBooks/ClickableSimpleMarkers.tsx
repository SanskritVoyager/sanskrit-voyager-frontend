import React, { useState, useEffect } from 'react';
import { useThrottledCallback } from '@mantine/hooks';
import classes from './ClickableSimpleBooks.module.css';

interface ScrollMarkersProps {
  containerRef: React.RefObject<HTMLDivElement>;
  segmentRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  matchedBookSegments: number[];
  activeSegment: number | null;
  onSegmentClick: (segmentNumber: number) => void;
  initialRenderComplete: boolean;
  // New prop to distinguish search matches
  searchMatchedSegments?: number[];
}

interface SegmentMarker {
  segmentNumber: number;
  positionPercent: number;
  isSearchMatch: boolean;
}

const ScrollMarkers: React.FC<ScrollMarkersProps> = ({ 
  containerRef,
  segmentRefs,
  matchedBookSegments,
  activeSegment,
  onSegmentClick,
  initialRenderComplete,
  searchMatchedSegments = []
}) => {
  const [processedMatches, setProcessedMatches] = useState<SegmentMarker[]>([]);
  const [containerRightEdge, setContainerRightEdge] = useState<number>(0);

  // Update container edge position
  const updateRightEdgePosition = useThrottledCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerRightEdge(window.innerWidth - rect.right - 16);
    }
  }, 100);

  // Calculate marker positions with type information
  const calculateMarkerPositions = useThrottledCallback(() => {
    // console.log('[Markers] Attempting to calculate positions...');

    if (!containerRef.current) {
      // console.log('[Markers] Aborting: containerRef is null.');
      return;
    }

    const container = containerRef.current;
    const totalHeight = container.scrollHeight;
    
    // Combine both matched segments and search matched segments
    const allSegments = new Set([...matchedBookSegments, ...searchMatchedSegments]);

    // console.log(`[Markers] segmentRefs map size: ${segmentRefs.current.size}`);
    // console.log(`[Markers] allSegments size: ${allSegments.size}`);

    const segmentPositions = Array.from(allSegments)
      .map(segmentNumber => {
        const element = segmentRefs.current.get(segmentNumber);
        if (!element) return null;
        
        const positionPercent = (element.offsetTop / (totalHeight - 56)) * 100;
        
        return {
          segmentNumber,
          positionPercent: Math.max(0, Math.min(100, positionPercent)),
          // Mark if this is from in-page search
          isSearchMatch: searchMatchedSegments.includes(segmentNumber)
        };
      })
      .filter((pos): pos is SegmentMarker => pos !== null);
    
    setProcessedMatches(segmentPositions);
  }, 150);

  // Effect for container resize
  useEffect(() => {
    updateRightEdgePosition();
    
    const resizeObserver = new ResizeObserver(() => {
      updateRightEdgePosition();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateRightEdgePosition);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateRightEdgePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Effect for recalculating positions
  useEffect(() => {
    const hasSegments = matchedBookSegments.length > 0 || searchMatchedSegments.length > 0;
    // console.log(`[Markers Effect] Running. initialRenderComplete: ${initialRenderComplete}, hasSegments: ${hasSegments}`);

    
    if (initialRenderComplete && hasSegments) {
      const timer = setTimeout(() => {
        calculateMarkerPositions();
      }, 500);
      return () => clearTimeout(timer);
    } else if (!hasSegments) {
      setProcessedMatches([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedBookSegments, searchMatchedSegments, initialRenderComplete]);

  if (processedMatches.length === 0) {
    return null;
  }
  
  return (
    <div 
      className={classes.markerContainer}
      style={{ right: `${containerRightEdge}px` }}
    >
      {processedMatches.map(segment => {
        // Determine marker style based on type and state
        const isActive = segment.segmentNumber === activeSegment;
        const markerClass = `${classes.marker} ${
          isActive ? classes.activeMarker : ''
        } ${
          segment.isSearchMatch ? classes.searchMatchMarker : classes.bookMatchMarker
        }`;
        
        return (
          <div
            key={segment.segmentNumber}
            onClick={() => onSegmentClick(segment.segmentNumber)}
            className={markerClass}
            style={{ 
              top: `${segment.positionPercent}%`,
              height: segment.isSearchMatch ? '14px' : isActive ? '24px' : '12px',
              width: segment.isSearchMatch ? '10px' : '8px',
              opacity: isActive ? 0.8 : segment.isSearchMatch ? 0.7 : 0.5
            }}
            title={`${segment.isSearchMatch ? 'In-page search match' : 'Advanced search match'} - Go to segment ${segment.segmentNumber}`}
          />
        );
      })}
    </div>
  );
};

export default React.memo(ScrollMarkers);