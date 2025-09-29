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
  isSearchMatch?: boolean;
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
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const totalHeight = container.scrollHeight;
    
    const segmentPositions = matchedBookSegments
      .map(segmentNumber => {
        const element = segmentRefs.current.get(segmentNumber);
        if (!element) return null;
        
        const positionPercent = (element.offsetTop / (totalHeight - 56)) * 100;
        
        return {
          segmentNumber,
          positionPercent: Math.max(0, Math.min(100, positionPercent)),
          // Mark if this is from a search
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
  }, [updateRightEdgePosition]);

  // Effect for recalculating positions
  useEffect(() => {
    if (initialRenderComplete && matchedBookSegments.length > 0) {
      const timer = setTimeout(() => {
        calculateMarkerPositions();
      }, 500);
      return () => clearTimeout(timer);
    } else if (matchedBookSegments.length === 0) {
      setProcessedMatches([]);
    }
  }, [matchedBookSegments, searchMatchedSegments, initialRenderComplete, calculateMarkerPositions]);

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
          segment.isSearchMatch ? classes.searchMatchMarker : ''
        }`;
        
        // Different colors for different types
        const backgroundColor = segment.isSearchMatch
          ? 'var(--mantine-color-yellow-5)'  // Yellow for search matches
          : isActive
          ? 'var(--mantine-color-orange-6)'   // Orange for active
          : 'var(--mantine-color-orange-4)';   // Light orange for normal
        
        return (
          <div
            key={segment.segmentNumber}
            onClick={() => onSegmentClick(segment.segmentNumber)}
            className={markerClass}
            style={{ 
              top: `${segment.positionPercent}%`,
              backgroundColor,
              height: segment.isSearchMatch ? '14px' : isActive ? '24px' : '12px',
              width: segment.isSearchMatch ? '10px' : '8px',
              opacity: isActive ? 0.8 : segment.isSearchMatch ? 0.7 : 0.5
            }}
            title={`${segment.isSearchMatch ? 'Search match - ' : ''}Go to segment ${segment.segmentNumber}`}
          />
        );
      })}
    </div>
  );
};

export default React.memo(ScrollMarkers);