// app/hooks/useMousePosition.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ==========================================
// ENTERPRISE-GRADE MOUSE TRACKING SYSTEM
// ==========================================

interface MousePosition {
  readonly mouseX: number;
  readonly mouseY: number;
}

interface UseMousePositionOptions {
  readonly throttle?: number;
  readonly includeTouch?: boolean;
  readonly normalize?: boolean;
  readonly smoothing?: number;
  readonly bounds?: {
    readonly minX?: number;
    readonly maxX?: number;
    readonly minY?: number;
    readonly maxY?: number;
  };
}

interface MouseState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isActive: boolean;
  lastUpdate: number;
}

// ==========================================
// PRODUCTION-OPTIMIZED CONSTANTS
// ==========================================

const DEFAULT_OPTIONS: Required<Omit<UseMousePositionOptions, 'bounds'>> & { bounds?: UseMousePositionOptions['bounds'] } = {
  throttle: 16, // 60fps performance target
  includeTouch: true,
  normalize: false,
  smoothing: 0.1, // Smooth interpolation factor
  bounds: undefined
};

const INITIAL_STATE: MousePosition = {
  mouseX: 0,
  mouseY: 0
};

// ==========================================
// HIGH-PERFORMANCE MOUSE POSITION HOOK
// ==========================================

export function useMousePosition(options: UseMousePositionOptions = {}): MousePosition {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const {
    throttle,
    includeTouch,
    normalize,
    smoothing,
    bounds
  } = config;

  // ==========================================
  // STATE MANAGEMENT WITH PERFORMANCE OPTIMIZATION
  // ==========================================
  
  const [mousePosition, setMousePosition] = useState<MousePosition>(INITIAL_STATE);
  
  // Performance-optimized refs for state management
  const stateRef = useRef<MouseState>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isActive: false,
    lastUpdate: 0
  });
  
  const rafIdRef = useRef<number | null>(null);
  const smoothingRafRef = useRef<number | null>(null);

  // ==========================================
  // ADVANCED COORDINATE PROCESSING
  // ==========================================
  
  const processCoordinates = useCallback((clientX: number, clientY: number): MousePosition => {
    let processedX = clientX;
    let processedY = clientY;

    // Apply normalization if requested (-1 to 1 range)
    if (normalize) {
      if (typeof window !== 'undefined') {
        processedX = (clientX / window.innerWidth) * 2 - 1;
        processedY = -(clientY / window.innerHeight) * 2 + 1;
      }
    }

    // Apply boundary constraints
    if (bounds) {
      if (typeof bounds.minX === 'number') processedX = Math.max(processedX, bounds.minX);
      if (typeof bounds.maxX === 'number') processedX = Math.min(processedX, bounds.maxX);
      if (typeof bounds.minY === 'number') processedY = Math.max(processedY, bounds.minY);
      if (typeof bounds.maxY === 'number') processedY = Math.min(processedY, bounds.maxY);
    }

    return {
      mouseX: processedX,
      mouseY: processedY
    };
  }, [normalize, bounds]);

  // ==========================================
  // SMOOTH INTERPOLATION SYSTEM
  // ==========================================
  
  const smoothUpdate = useCallback(() => {
    const state = stateRef.current;
    
    if (!state.isActive) {
      smoothingRafRef.current = null;
      return;
    }

    // Apply smooth interpolation using lerp
    const deltaX = state.targetX - state.x;
    const deltaY = state.targetY - state.y;
    
    state.x += deltaX * smoothing;
    state.y += deltaY * smoothing;

    // Update position if change is significant enough
    const threshold = normalize ? 0.001 : 0.5;
    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      setMousePosition({
        mouseX: state.x,
        mouseY: state.y
      });
    }

    // Continue smoothing if not close enough to target
    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      smoothingRafRef.current = requestAnimationFrame(smoothUpdate);
    } else {
      smoothingRafRef.current = null;
    }
  }, [smoothing, normalize]);

  // ==========================================
  // OPTIMIZED EVENT HANDLER
  // ==========================================
  
  const handlePointerMove = useCallback((event: MouseEvent | TouchEvent) => {
    const now = performance.now();
    const state = stateRef.current;
    
    // High-performance throttling
    if (now - state.lastUpdate < throttle) {
      return;
    }
    
    state.lastUpdate = now;
    state.isActive = true;

    let clientX: number;
    let clientY: number;

    // Extract coordinates with comprehensive error handling
    try {
      if ('touches' in event && event.touches && event.touches.length > 0) {
        const touch = event.touches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else if ('clientX' in event && typeof event.clientX === 'number') {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        return;
      }
    } catch (error) {
      console.warn('Error extracting pointer coordinates:', error);
      return;
    }

    // Process coordinates
    const processed = processCoordinates(clientX, clientY);
    
    // Update target position for smooth interpolation
    state.targetX = processed.mouseX;
    state.targetY = processed.mouseY;

    // Start smoothing animation if not already running
    if (!smoothingRafRef.current && smoothing > 0) {
      smoothingRafRef.current = requestAnimationFrame(smoothUpdate);
    } else if (smoothing === 0) {
      // Direct update without smoothing
      state.x = processed.mouseX;
      state.y = processed.mouseY;
      setMousePosition(processed);
    }

    // Cancel any pending RAF updates to prevent redundant calls
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, [throttle, processCoordinates, smoothing, smoothUpdate]);

  // ==========================================
  // POINTER LEAVE HANDLER
  // ==========================================
  
  const handlePointerLeave = useCallback(() => {
    stateRef.current.isActive = false;
    
    // Cancel any pending animations
    if (smoothingRafRef.current) {
      cancelAnimationFrame(smoothingRafRef.current);
      smoothingRafRef.current = null;
    }
    
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // ==========================================
  // ENTERPRISE-GRADE LIFECYCLE MANAGEMENT
  // ==========================================
  
  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') return;

    // Initialize with current cursor position if available
    try {
      if ('getCoalescedEvents' in MouseEvent.prototype) {
        // Modern browsers with high-precision input support
        console.info('High-precision pointer events supported');
      }
    } catch (error) {
      // Fallback for older browsers - no action needed
    }

    // Configure event options for optimal performance
    const eventOptions: AddEventListenerOptions = { 
      passive: true,
      capture: false
    };

    // Attach primary mouse listener
    window.addEventListener('mousemove', handlePointerMove, eventOptions);
    window.addEventListener('mouseleave', handlePointerLeave, eventOptions);

    // Attach touch listeners if enabled
    if (includeTouch) {
      window.addEventListener('touchmove', handlePointerMove, eventOptions);
      window.addEventListener('touchstart', handlePointerMove, eventOptions);
      window.addEventListener('touchend', handlePointerLeave, eventOptions);
      window.addEventListener('touchcancel', handlePointerLeave, eventOptions);
    }

    // Comprehensive cleanup function
    return () => {
      // Remove all event listeners
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      
      if (includeTouch) {
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchstart', handlePointerMove);
        window.removeEventListener('touchend', handlePointerLeave);
        window.removeEventListener('touchcancel', handlePointerLeave);
      }

      // Cancel all pending animation frames
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (smoothingRafRef.current) {
        cancelAnimationFrame(smoothingRafRef.current);
        smoothingRafRef.current = null;
      }

      // Reset state
      stateRef.current.isActive = false;
    };
  }, [handlePointerMove, handlePointerLeave, includeTouch]);

  // ==========================================
  // VISIBILITY CHANGE OPTIMIZATION
  // ==========================================
  
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePointerLeave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handlePointerLeave]);

  return mousePosition;
}

// ==========================================
// LIGHTWEIGHT VERSION FOR BASIC USE CASES
// ==========================================

export function useSimpleMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>(INITIAL_STATE);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      
      // Only update if position actually changed
      if (clientX !== lastX || clientY !== lastY) {
        lastX = clientX;
        lastY = clientY;
        
        // Use RAF for smooth updates
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setPosition({ mouseX: clientX, mouseY: clientY });
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return position;
}

// ==========================================
// PRODUCTION-READY EXPORTS
// ==========================================

export type { MousePosition, UseMousePositionOptions };