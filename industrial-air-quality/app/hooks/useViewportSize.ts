// app/hooks/useViewportSize.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ==========================================
// ADVANCED TYPE DEFINITIONS
// ==========================================

interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

interface ViewportMetrics extends ViewportSize {
  readonly aspectRatio: number;
  readonly orientation: 'portrait' | 'landscape';
  readonly devicePixelRatio: number;
  readonly isSmallScreen: boolean;
  readonly isMediumScreen: boolean;
  readonly isLargeScreen: boolean;
}

interface UseViewportSizeOptions {
  readonly throttle?: number;
  readonly includeMetrics?: boolean;
  readonly breakpoints?: {
    readonly small: number;
    readonly medium: number;
    readonly large: number;
  };
  readonly debounce?: number;
  readonly onResize?: (metrics: ViewportMetrics) => void;
}

interface ResizeObserverState {
  observer: ResizeObserver | null;
  isSupported: boolean;
}

// ==========================================
// DEFAULT CONFIGURATIONS
// ==========================================

const DEFAULT_OPTIONS: Required<UseViewportSizeOptions> = {
  throttle: 16, // 60fps throttling
  includeMetrics: false,
  breakpoints: {
    small: 768,
    medium: 1024,
    large: 1440
  },
  debounce: 100,
  onResize: () => {}
};

const INITIAL_STATE: ViewportSize = {
  width: typeof window !== 'undefined' ? window.innerWidth : 1920,
  height: typeof window !== 'undefined' ? window.innerHeight : 1080
};

// ==========================================
// PERFORMANCE-OPTIMIZED UTILITIES
// ==========================================

const calculateMetrics = (
  width: number, 
  height: number, 
  breakpoints: UseViewportSizeOptions['breakpoints']
): ViewportMetrics => {
  const aspectRatio = width / height;
  const orientation = width >= height ? 'landscape' : 'portrait';
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  
  const bp = breakpoints!;
  const isSmallScreen = width <= bp.small;
  const isMediumScreen = width > bp.small && width <= bp.medium;
  const isLargeScreen = width > bp.medium;

  return {
    width,
    height,
    aspectRatio: Math.round(aspectRatio * 100) / 100,
    orientation,
    devicePixelRatio,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen
  };
};

// ==========================================
// ENTERPRISE-GRADE VIEWPORT HOOK
// ==========================================

export function useViewportSize(options: UseViewportSizeOptions = {}): ViewportMetrics {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { 
    throttle, 
    includeMetrics, 
    breakpoints, 
    debounce, 
    onResize 
  } = config;

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const [viewportSize, setViewportSize] = useState<ViewportSize>(INITIAL_STATE);
  
  // Performance optimization refs
  const rafId = useRef<number | null>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const lastUpdate = useRef<number>(0);
  const pendingSize = useRef<ViewportSize>(INITIAL_STATE);
  const resizeObserverState = useRef<ResizeObserverState>({
    observer: null,
    isSupported: typeof window !== 'undefined' && 'ResizeObserver' in window
  });

  // ==========================================
  // OPTIMIZED UPDATE MECHANISMS
  // ==========================================

  const commitSizeUpdate = useCallback(() => {
    const newSize = pendingSize.current;
    const hasChanged = 
      newSize.width !== viewportSize.width || 
      newSize.height !== viewportSize.height;

    if (hasChanged) {
      setViewportSize(newSize);
      
      if (includeMetrics && onResize) {
        const metrics = calculateMetrics(newSize.width, newSize.height, breakpoints);
        onResize(metrics);
      }
    }
    
    rafId.current = null;
  }, [viewportSize.width, viewportSize.height, includeMetrics, onResize, breakpoints]);

  const scheduleUpdate = useCallback((width: number, height: number) => {
    const now = performance.now();
    
    // High-performance throttling
    if (now - lastUpdate.current < throttle) {
      return;
    }
    
    lastUpdate.current = now;
    pendingSize.current = { width, height };

    // Cancel previous frame request
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    // Schedule update on next frame
    rafId.current = requestAnimationFrame(commitSizeUpdate);
  }, [throttle, commitSizeUpdate]);

  const debouncedResize = useCallback((width: number, height: number) => {
    // Clear existing timeout
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    // Immediate update for rapid interactions
    scheduleUpdate(width, height);

    // Debounced callback for final state
    timeoutId.current = setTimeout(() => {
      if (includeMetrics && onResize) {
        const metrics = calculateMetrics(width, height, breakpoints);
        onResize(metrics);
      }
    }, debounce);
  }, [scheduleUpdate, includeMetrics, onResize, breakpoints, debounce]);

  // ==========================================
  // RESIZE DETECTION STRATEGIES
  // ==========================================

  const handleWindowResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    debouncedResize(width, height);
  }, [debouncedResize]);

  const initializeResizeObserver = useCallback(() => {
    if (!resizeObserverState.current.isSupported || resizeObserverState.current.observer) {
      return;
    }

    try {
      const observer = new ResizeObserver((entries) => {
        // Use the last entry for optimal performance
        const entry = entries[entries.length - 1];
        if (!entry) return;

        const { inlineSize: width, blockSize: height } = entry.contentBoxSize[0] || {};
        
        if (width && height) {
          debouncedResize(Math.round(width), Math.round(height));
        }
      });

      // Observe document element for viewport changes
      observer.observe(document.documentElement);
      resizeObserverState.current.observer = observer;
      
    } catch (error) {
      console.warn('ResizeObserver initialization failed:', error);
      resizeObserverState.current.isSupported = false;
    }
  }, [debouncedResize]);

  // ==========================================
  // LIFECYCLE MANAGEMENT
  // ==========================================

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') return;

    // Initialize with current viewport size
    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;
    
    setViewportSize({ width: initialWidth, height: initialHeight });
    pendingSize.current = { width: initialWidth, height: initialHeight };

    // Prefer ResizeObserver for accuracy, fallback to window resize
    if (resizeObserverState.current.isSupported) {
      initializeResizeObserver();
    }

    // Always add window resize listener as backup
    const eventOptions: AddEventListenerOptions = { 
      passive: true, 
      capture: false 
    };
    
    window.addEventListener('resize', handleWindowResize, eventOptions);
    
    // Handle orientation changes on mobile devices
    window.addEventListener('orientationchange', handleWindowResize, eventOptions);

    // Cleanup function with comprehensive resource management
    return () => {
      // Remove event listeners
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
      
      // Cancel pending animations and timeouts
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
        timeoutId.current = null;
      }
      
      // Cleanup ResizeObserver
      if (resizeObserverState.current.observer) {
        resizeObserverState.current.observer.disconnect();
        resizeObserverState.current.observer = null;
      }
    };
  }, [handleWindowResize, initializeResizeObserver]);

  // ==========================================
  // COMPUTED METRICS EXPORT
  // ==========================================

  return includeMetrics 
    ? calculateMetrics(viewportSize.width, viewportSize.height, breakpoints)
    : {
        ...viewportSize,
        aspectRatio: viewportSize.width / viewportSize.height,
        orientation: viewportSize.width >= viewportSize.height ? 'landscape' : 'portrait',
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        isSmallScreen: viewportSize.width <= breakpoints!.small,
        isMediumScreen: viewportSize.width > breakpoints!.small && viewportSize.width <= breakpoints!.medium,
        isLargeScreen: viewportSize.width > breakpoints!.medium
      };
}

// ==========================================
// LIGHTWEIGHT VERSION FOR BASIC USE CASES
// ==========================================

export function useSimpleViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(INITIAL_STATE);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Only update if dimensions actually changed
      if (width !== lastWidth || height !== lastHeight) {
        lastWidth = width;
        lastHeight = height;
        
        // Use RAF for smooth updates
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setSize({ width, height });
        });
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return size;
}